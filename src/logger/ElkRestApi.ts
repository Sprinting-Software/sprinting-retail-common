import { fetchOrFail } from "../http/fetchOrFail"
import { RawLogger } from "./RawLogger"
import { ElkRestApiConfig } from "./types"

export class ElkRestApi {
  static hasNotified = false

  private endpoint: string
  private apiKey: string
  private indexName: string

  constructor(config: ElkRestApiConfig) {
    this.endpoint = config.endpoint
    this.apiKey = config.apiKey
    this.indexName = config.indexName
  }

  async postManyDocuments(logs: ElkLog[]): Promise<void> {
    if (logs.length === 0) return
    await this.postBulkObjects(logs, logs[0].env)
  }

  async postSingleDocument(log: ElkLog): Promise<void> {
    await this.postObject(log, log.env)
  }

  private async postObject(log: ElkLog, env: string): Promise<void> {
    const indexName = `${this.indexName}${env}`
    this.informOnce(indexName)

    try {
      await fetchOrFail(`${this.endpoint}/${indexName}/_doc/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(log),
      })
      RawLogger.debug("Successfully sent record to ELK in index", indexName)
    } catch (error) {
      RawLogger.debug("Failed to post document:", error)
    }
  }

  private async postBulkObjects(logs: ElkLog[], env: string): Promise<void> {
    const indexName = `${this.indexName}${env}`
    this.informOnce(indexName)

    const bulkRequestBody = `${logs
      .map((log) => {
        return `${JSON.stringify({ index: { _index: indexName } })}\n${JSON.stringify(log)}`
      })
      .join("\n")}\n`

    try {
      const response = await fetch(`${this.endpoint}/_bulk`, {
        method: "POST",
        headers: this.getHeaders(),
        body: bulkRequestBody,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      RawLogger.debug(`Successfully sent ${logs.length} records to ELK in index`, indexName)
    } catch (error) {
      RawLogger.debug("Failed to post bulk documents:", error)
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${this.apiKey}`,
    }
  }

  private informOnce(indexName: string): void {
    if (!ElkRestApi.hasNotified) {
      RawLogger.debug(`**** Sending logs to index ${indexName}`)
      ElkRestApi.hasNotified = true
    }
  }
}

// Example usage
interface ElkLog {
  env: string
  [key: string]: any
}
