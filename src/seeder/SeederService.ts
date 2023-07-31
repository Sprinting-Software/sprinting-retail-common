import { Injectable } from "@nestjs/common"
import { LoggerService } from "../logger/LoggerService"
import { Exception } from "../errorHandling/exceptions/Exception"
import { encodeValue } from "../helpers/SeederHelper"

type DbConnection = any
export interface SeederServiceParams {
  systemName: string
  envName: string
  jsonData: object[]
  dbConnection: DbConnection
  tableName: string
  primaryKeys: string[]
  resetBy?: Record<string, any>
  dryRun?: boolean
}

@Injectable()
export class SeederService {
  constructor(private readonly logger: LoggerService) {}

  private readonly chunkSize = 50

  async seedTable(params: SeederServiceParams): Promise<void> {
    const chunks = this.chunkArray(params.jsonData, this.chunkSize)
    const { dbConnection, tableName, systemName, envName, dryRun = false } = params
    try {
      console.log(`Seeding start. System: ${systemName}, Env: ${envName}, Table: ${tableName}`)

      if (dryRun) {
        for (const chunk of chunks) {
          for (const row of chunk) {
            this.logEvent(params, row)
          }
        }
        return
      }

      await dbConnection.query("BEGIN")

      if (params?.resetBy && Object.keys(params?.resetBy).length > 0) {
        await dbConnection.query(this.deleteQuery(params))
      }

      for (const chunk of chunks) {
        const query = this.upsertQuery({ ...params, jsonData: chunk })
        await dbConnection.query(query)
        for (const row of chunk) {
          this.logEvent(params, row)
        }
      }

      await dbConnection.query("COMMIT")

      console.log(`Seeding successfully finished`)
    } catch (error) {
      if (!dryRun) {
        await dbConnection.query("ROLLBACK")
      }

      console.log(error)
      if (error instanceof Error || error instanceof Exception) {
        this.logger.logError(error)
      } else {
        this.logger.logError(new Error(String(error)))
      }
    }
  }

  private upsertQuery(params: SeederServiceParams): string | boolean {
    const { tableName, jsonData, primaryKeys } = params

    if (!jsonData.length) {
      return ""
    }

    return jsonData
      .map((object: any) => {
        const insertColumns = Object.keys(object)
          .map((columnName) => `"${columnName}"`)
          .join(",")

        const insertColumnsString = `INSERT INTO "${tableName}" (${insertColumns})`

        const singleInsertValue = Object.keys(object)
          .map((columnName) => {
            return encodeValue(object[columnName])
          })
          .join(",")

        const insertValuesString = `\nVALUES (${singleInsertValue})`

        const conflictString = () => {
          if (primaryKeys === null) {
            return ""
          } else {
            const conflictKeys = primaryKeys.map((columnName) => `"${columnName}"`).join(",")
            const conflictValues = Object.keys(object)
              .filter((columnName) => primaryKeys.indexOf(columnName) === -1)
              .map((columnName) => {
                return `"${columnName}" = excluded."${columnName}"`
              })
              .join(",")

            if (conflictValues.length > 0) {
              return `ON CONFLICT (${conflictKeys}) DO UPDATE SET ${conflictValues};`
            } else {
              return `ON CONFLICT (${conflictKeys}) DO NOTHING;`
            }
          }
        }

        return `${insertColumnsString} ${insertValuesString} ${conflictString()}`
      })
      .join("\n")
  }

  private deleteQuery({ tableName, resetBy }: SeederServiceParams): string {
    if (!resetBy || Object.keys(resetBy).length === 0) {
      return ""
    }

    const deleteConditions = Object.entries(resetBy)
      .map(([key, value]) => `"${key}" = ${encodeValue(value)}`)
      .join(" AND ")

    return `DELETE FROM "${tableName}" WHERE ${deleteConditions}`
  }

  private logEvent(params: SeederServiceParams, row: Record<string, any>): void {
    this.logger.event(__filename, params.envName, row, "seed", { tenantId: row?.tenantId })
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}
