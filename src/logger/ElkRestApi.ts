import { StringUtil } from "../helpers/StringUtil"
import { fetchOrFail } from "../http/fetchOrFail"
import { RawLogger } from "./RawLogger"
import { ElkCustomIndexMessage, ElkLog, ElkRestApiConfig } from "./types"

export class ElkRestApi {
  static hasNotified = false

  private endpoint: string
  private apiKey: string
  private indexName: string

  constructor(config: ElkRestApiConfig) {
    this.endpoint = config.endpoint
    this.apiKey = config.apiKey
    this.indexName = config.indexName.trim()
  }

  async sendManyDocuments(logs: ElkLog[]): Promise<void> {
    if (logs.length === 0) return
    await this.postBulkObjects(logs)
  }

  async sendSingleDocument(log: ElkLog): Promise<void> {
    this.informOnce(this.indexName)

    try {
      await fetchOrFail(`${this.endpoint}/${this.indexName}/_doc/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: StringUtil.stringifySafe(log),
      })
      // eslint-disable-next-line prefer-template
      RawLogger.debug("Successfully sent record to ELK in index '" + this.indexName + "'")
    } catch (error) {
      RawLogger.debug("Failed to post document:", error)
    }
  }

  async sendUpsertSingleDocumentCustomIndex({ data, indexName, id }: ElkCustomIndexMessage): Promise<void> {
    this.informOnce(indexName)

    try {
      await fetchOrFail(`${this.endpoint}/${indexName}/_doc/${id}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: StringUtil.stringifySafe(data),
      })
      // eslint-disable-next-line prefer-template
      RawLogger.debug("Successfully sent record to ELK in index '" + this.indexName + "'")
    } catch (error) {
      RawLogger.debug("Failed to post document:", error)
    }
  }

  private async postBulkObjects(logs: ElkLog[]): Promise<void> {
    this.informOnce(this.indexName)

    const bulkRequestBody = `${logs
      .map((log) => {
        return `${StringUtil.stringifySafe({ index: { _index: this.indexName } })}\n${StringUtil.stringifySafe(log)}`
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

      RawLogger.debug(
        `Successfully sent ${logs.length} records to ELK in index "`,
        this.indexName,
        '". The logs were: ',
        StringUtil.stringifySafe(logs)
      )
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
