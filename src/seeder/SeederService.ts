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
  deleteBy?: Record<string, any>[]
  dryRun?: boolean
}

@Injectable()
export class SeederService {
  constructor(private readonly logger: LoggerService) {}

  async seedTable(params: SeederServiceParams): Promise<void> {
    const { dbConnection, dryRun = false } = params
    try {
      if (dryRun) {
        for (const row of params.jsonData) {
          this.logEvent(params, row)
        }
        return
      }

      await dbConnection.query("BEGIN")

      if (params?.deleteBy && params?.deleteBy?.length > 0) {
        await dbConnection.query(this.deleteQueries(params))
      }

      for (const row of params.jsonData) {
        const query = this.upsertQuery(params)
        await dbConnection.query(query)
        this.logEvent(params, row)
      }

      await dbConnection.query("COMMIT")
    } catch (error) {
      if (!dryRun) {
        await dbConnection.query("ROLLBACK")
      }

      if (error instanceof Error || error instanceof Exception) {
        this.logger.logError(error)
      } else {
        this.logger.logError(new Error(String(error)))
      }
    }
  }

  private upsertQuery({ tableName, jsonData, primaryKeys }: SeederServiceParams): string | boolean {
    if (!jsonData.length) {
      return ""
    }

    const insertColumns = Object.keys(jsonData[0])
      .map((columnName) => `"${columnName}"`)
      .join(",")
    const insertColumnsString = `INSERT INTO "${tableName}" (${insertColumns})`
    const insertValues = jsonData
      .map((object) => {
        const singleInsertValue = Object.keys(object)
          .map((columnName) => {
            return encodeValue(object[columnName])
          })
          .join(",")

        return `(${singleInsertValue})`
      })
      .join(",\n")

    const insertValuesString = `\nVALUES ${insertValues}`

    const conflictString = () => {
      if (primaryKeys === null) {
        return ""
      } else {
        const conflictKeys = primaryKeys.map((columnName) => `"${columnName}"`).join(",")
        const conflictValues = Object.keys(jsonData[0])
          .filter((columnName) => primaryKeys.indexOf(columnName) === -1)
          .map((columnName) => {
            return `"${columnName}" = excluded."${columnName}"`
          })
          .join(",")
        return `ON CONFLICT (${conflictKeys}) DO UPDATE SET ${conflictValues};`
      }
    }

    return `${insertColumnsString} ${insertValuesString} ${conflictString()}`
  }

  private deleteQueries({ tableName, deleteBy }: SeederServiceParams): string {
    if (!deleteBy || Object.keys(deleteBy).length === 0) {
      return ""
    }

    const deleteConditions = Object.entries(deleteBy)
      .map(([key, value]) => `"${key}" = ${encodeValue(value)}`)
      .join(" AND ")

    return `DELETE FROM "${tableName}" WHERE ${deleteConditions}`
  }

  private logEvent(params: SeederServiceParams, row: Record<string, any>): void {
    this.logger.event(__filename, params.envName, row, "seed", { tenantId: row?.tenantId })
    console.log(`${params.envName} seed - ${JSON.stringify(row)}`)
  }
}
