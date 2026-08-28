import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common"
import { ElkV9BulkConfig } from "../config/interface/LibConfig"
import { Exception } from "../errorHandling/exceptions/Exception"
import { fetchOrFailRaw } from "../http/fetchOrFail"

export const ELK_V9_CONFIG = Symbol("ELK_V9_CONFIG")

export type BulkLogEntry = {
  /** Target index for this specific document (see ElkV9LoggerService for how this is built). */
  index: string
  doc: Record<string, any>
}

class BulkDeliveryError extends Error {
  constructor(message: string, readonly entries: BulkLogEntry[]) {
    super(message)
  }
}

@Injectable()
export class BulkLogService implements OnModuleDestroy {
  private readonly buffer: BulkLogEntry[] = []
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

  /**
   * @param index Target index for this document, e.g. `a-bifrostbackend-error-2026.34`
   *   (see ElkV9LoggerService.buildIndexName). Each entry in a single batch may target a
   *   different index — the Elasticsearch `_bulk` API supports mixed-index requests natively.
   */
  log(index: string, doc: Record<string, any>): void {
    try {
      if (this.buffer.length >= this.maxBufferSize) {
        this.fallback([this.buffer.shift()], new Error("ELK v9 log buffer is full"))
      }
      this.buffer.push({ index, doc })
      if (this.buffer.length >= this.batchSize) void this.flush()
    } catch (error) {
      this.fallback([{ index, doc }], error)
    }
  }

  flush(): Promise<void> {
    if (this.flushing) return this.flushing
    if (!this.buffer.length) return Promise.resolve()

    const entries = this.buffer.splice(0, this.batchSize)
    this.flushing = this.send(entries)
      .catch((error) => this.fallback(error instanceof BulkDeliveryError ? error.entries : entries, error))
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

  private async send(entries: BulkLogEntry[]): Promise<void> {
    const payload = entries
      .flatMap(({ index, doc }) => [JSON.stringify({ create: { _index: index } }), JSON.stringify(doc)])
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
        const failedEntries = result.items
          ?.map((item: Record<string, { status: number }>, itemIndex: number) =>
            Object.values(item).some(({ status }) => status >= 300) ? entries[itemIndex] : undefined
          )
          .filter((entry: BulkLogEntry | undefined): entry is BulkLogEntry => Boolean(entry))
        throw new BulkDeliveryError(
          "Elasticsearch bulk request contained item failures",
          failedEntries?.length ? failedEntries : entries
        )
      }
      return
    }
  }

  private backoff(attempt: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
  }

  private fallback(entries: Array<BulkLogEntry | undefined>, error: unknown): void {
    try {
      // eslint-disable-next-line no-console
      console.log("Failed to deliver ELK v9 logs; writing to console", error)
      for (const entry of entries) {
        if (entry) {
          // eslint-disable-next-line no-console
          console.log("ELK v9 fallback log", entry.index, entry.doc)
        }
      }
    } catch {
      // Logging must never crash application code.
    }
  }
}
