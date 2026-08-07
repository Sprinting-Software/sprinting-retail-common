import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common"
import { ElkV9BulkConfig } from "../config/interface/LibConfig"
import { Exception } from "../errorHandling/exceptions/Exception"
import { fetchOrFailRaw } from "../http/fetchOrFail"

export const ELK_V9_CONFIG = Symbol("ELK_V9_CONFIG")

class BulkDeliveryError extends Error {
  constructor(message: string, readonly logs: Record<string, any>[]) {
    super(message)
  }
}

@Injectable()
export class BulkLogService implements OnModuleDestroy {
  private readonly buffer: Record<string, any>[] = []
  private readonly timer: NodeJS.Timeout
  private flushing: Promise<void> | undefined
  private readonly batchSize: number
  private readonly maxBufferSize: number
  private readonly maxRetries: number

  constructor(@Inject(ELK_V9_CONFIG) private readonly config: ElkV9BulkConfig) {
    this.batchSize = Math.max(1, Math.floor(config.maxBatchSize ?? 100))
    this.maxBufferSize = Math.max(1, Math.floor(config.maxBufferSize ?? 1000))
    this.maxRetries = Math.max(0, Math.floor(config.maxRetries ?? 3))
    this.timer = setInterval(() => void this.flush(), Math.max(1, config.flushIntervalMs ?? 5000))
    this.timer.unref()
  }

  log(log: Record<string, any>): void {
    try {
      if (this.buffer.length >= this.maxBufferSize) {
        this.fallback([this.buffer.shift()], new Error("ELK v9 log buffer is full"))
      }
      this.buffer.push(log)
      if (this.buffer.length >= this.batchSize) void this.flush()
    } catch (error) {
      this.fallback([log], error)
    }
  }

  flush(): Promise<void> {
    if (this.flushing) return this.flushing
    if (!this.buffer.length) return Promise.resolve()

    const logs = this.buffer.splice(0, this.batchSize)
    this.flushing = this.send(logs)
      .catch((error) => this.fallback(error instanceof BulkDeliveryError ? error.logs : logs, error))
      .finally(() => {
        this.flushing = undefined
        if (this.buffer.length >= this.batchSize) void this.flush()
      })
    return this.flushing
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer)
    while (this.flushing || this.buffer.length) await this.flush()
  }

  private async send(logs: Record<string, any>[]): Promise<void> {
    const payload = logs
      .flatMap((log) => [JSON.stringify({ create: { _index: this.config.dataStream } }), JSON.stringify(log)])
      .join("\n")
      .concat("\n")
    const url = `${this.config.endpoint.replace(/\/$/, "")}/_bulk`

    for (let attempt = 0; ; attempt++) {
      let response: Response
      try {
        response = await fetchOrFailRaw(
          url,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-ndjson",
              Authorization: `ApiKey ${this.config.apiKey}`,
            },
            body: payload,
          },
          "Elasticsearch"
        )
      } catch (error) {
        if (error instanceof Exception && error.httpStatus < 500) throw error
        if (attempt >= this.maxRetries) throw error
        await this.backoff(attempt)
        continue
      }

      const result = await response.json()
      if (result.errors) {
        const failedLogs = result.items
          ?.map((item: Record<string, { status: number }>, index: number) =>
            Object.values(item).some(({ status }) => status >= 300) ? logs[index] : undefined
          )
          .filter((log: Record<string, any> | undefined): log is Record<string, any> => Boolean(log))
        throw new BulkDeliveryError(
          "Elasticsearch bulk request contained item failures",
          failedLogs?.length ? failedLogs : logs
        )
      }
      return
    }
  }

  private backoff(attempt: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
  }

  private fallback(logs: Array<Record<string, any> | undefined>, error: unknown): void {
    try {
      // eslint-disable-next-line no-console
      console.log("Failed to deliver ELK v9 logs; writing to console", error)
      for (const log of logs) {
        if (log) {
          // eslint-disable-next-line no-console
          console.log("ELK v9 fallback log", log)
        }
      }
    } catch {
      // Logging must never crash application code.
    }
  }
}
