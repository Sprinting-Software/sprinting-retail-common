import { StringUtils } from "../helpers/StringUtils"
import { fetchOrFail } from "../http/fetchOrFail"
import { RawLogger } from "./RawLogger"
import { ElkCustomIndexMessage, ElkLog, ElkRestApiConfig } from "./types"

export class ElkRestApi {
  static hasNotified = false

  private endpoint: string
  private apiKey: string
  private indexName: string

  constructor(config: ElkRestApiConfig) {
    /*if (!config.endpoint || !config.apiKey || !config.indexName) {
      RawLogger.error("ElkRestApi: Invalid configuration — missing required fields", config)
    }*/

    this.endpoint = config.endpoint?.trim()
    this.apiKey = config.apiKey?.trim()
    this.indexName = config.indexName?.trim()
  }

  async sendManyDocuments(logs: ElkLog[]): Promise<void> {
    if (logs.length === 0) return

    try {
      await this.postBulkObjects(logs)
    } catch (error) {
      RawLogger.error("ElkRestApi: Failed to send many documents:", error)
    }
  }

  async sendSingleDocument(log: ElkLog): Promise<void> {
    this.informOnce(this.indexName)

    try {
      await fetchOrFail(`${this.endpoint}/${this.indexName}/_doc/`, {
        method: "POST",
        headers: this.getHeaders(),
        body: StringUtils.stringifySafe(log),
      })

      RawLogger.debug(`ElkRestApi: Successfully sent record to ELK in index '${this.indexName}'`)
    } catch (error) {
      RawLogger.error("ElkRestApi: Failed to post single document:", error)
    }
  }

  async sendUpsertSingleDocumentCustomIndex({ data, indexName, id }: ElkCustomIndexMessage): Promise<void> {
    this.informOnce(indexName)

    try {
      await fetchOrFail(`${this.endpoint}/${indexName}/_doc/${id}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: StringUtils.stringifySafe(data),
      })

      RawLogger.debug(`ElkRestApi: Successfully upserted record to ELK in index '${indexName}'`)
    } catch (error) {
      RawLogger.error("ElkRestApi: Failed to upsert document:", error)
    }
  }

  private async postBulkObjects(logs: ElkLog[]): Promise<void> {
    this.informOnce(this.indexName)

    const bulkRequestBody = `${logs
      .map((log) => {
        const meta = StringUtils.stringifySafe({ index: { _index: this.indexName } })
        const body = StringUtils.stringifySafe(log)
        return `${meta}\n${body}`
      })
      .join("\n")}\n`

    try {
      const response = await fetchOrFail(`${this.endpoint}/_bulk`, {
        method: "POST",
        headers: this.getHeaders(),
        body: bulkRequestBody,
      })

      let result: any
      try {
        result = await response.json()
      } catch (parseError) {
        RawLogger.error("ElkRestApi: Failed to parse bulk response JSON:", parseError)
        return
      }

      if (result.errors === true) {
        const failures = result.items
          .map((item: any, index: number) => ({ item, index }))
          .filter(({ item }: any) => item.index?.error)
          .map(({ item, index }: any) => ({
            documentIndex: index,
            status: item.index.status,
            error: item.index.error,
            documentSnippet: StringUtils.stringifySafe(logs[index]).substring(0, 200),
          }))

        RawLogger.error(`ElkRestApi: Bulk indexing had ${failures.length} failures`, failures)

        if (failures.length > 0) {
          RawLogger.error("ElkRestApi: First failure detail:", JSON.stringify(failures[0], null, 2))
        }
      } else {
        RawLogger.debug(`ElkRestApi: Successfully sent ${logs.length} records to ELK index '${this.indexName}'`)
      }
    } catch (error) {
      RawLogger.error("ElkRestApi: Failed to post bulk documents:", error)
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
