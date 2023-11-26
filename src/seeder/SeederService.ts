import { Injectable } from "@nestjs/common"
import { LoggerService } from "../logger/LoggerService"
import { Exception } from "../errorHandling/exceptions/Exception"
import { encodeValue } from "../helpers/SeederHelper"
import * as fs from "fs"
import * as path from "path"

type DbConnection = any

export interface SeedParams {
  tableName: string
  primaryKeys?: string[]
  data: object[]
  resetBy?: Record<string, any>
  filterByTenantId?: string
}

export interface SeederServiceParams {
  systemName: string
  envName: string
  dbConnection: DbConnection
  path?: string
  dryRun?: boolean
  seedItems?: Array<string | SeedParams>
  filterByTenantIds?: number[]
}

export type SeedTableParams = SeederServiceParams & { seed: SeedParams }

@Injectable()
export class SeederService {
  constructor(private readonly logger: LoggerService) {}

  private readonly chunkSize = 50

  async seeds(params: SeederServiceParams): Promise<void> {
    const { systemName, envName, path: dirPath, seedItems } = params

    this.logger.info(__filename, `Seeding started. System: ${systemName}, Env: ${envName}`)

    if (seedItems && seedItems.length > 0) {
      for (const item of seedItems) {
        if (typeof item === "object") {
          await this.processObject(params, item)
        } else {
          const filePath = path.join(dirPath, item)
          if (fs.existsSync(filePath)) {
            await this.processJsonFile(params, filePath)
          }
        }
      }
    } else {
      const files = fs.readdirSync(dirPath)
      for (const file of files) {
        if (path.extname(file) === ".json") {
          const filePath = path.join(dirPath, file)
          await this.processJsonFile(params, filePath)
        }
      }
    }
    this.logger.info(__filename, "Seeds are finished")
  }

  async autoSeeds(params: SeederServiceParams): Promise<void> {
    const { systemName, envName, seedItems } = params

    this.logger.info(__filename, `AutoSeeds started. System: ${systemName}, Env: ${envName}`)

    for (const item of seedItems) {
      await this.processObject(params, item as SeedParams)
    }

    this.logger.info(__filename, "AutoSeeds are finished")
  }

  private async processJsonFile(params: SeederServiceParams, filePath: string): Promise<void> {
    const fileContent = fs.readFileSync(filePath, "utf-8")
    const seedParams: SeedParams = JSON.parse(fileContent)
    await this.processObject(params, seedParams)
  }

  private async processObject(params: SeederServiceParams, item: SeedParams): Promise<void> {
    if (
      params?.filterByTenantIds &&
      params?.filterByTenantIds.length > 0 &&
      (item?.filterByTenantId || item?.primaryKeys?.includes("tenantId"))
    ) {
      const filterKey = item?.filterByTenantId || "tenantId"
      item.data = item.data.filter((item) => params?.filterByTenantIds.includes(item[filterKey]))
    }

    await this.seedItem({ ...params, seed: item })
  }

  async seedItem(params: SeedTableParams): Promise<void> {
    const chunks = this.chunkArray(params.seed.data, this.chunkSize)
    const { dbConnection, seed, dryRun = false } = params
    const { tableName, resetBy } = seed

    try {
      // eslint-disable-next-line no-console
      console.log(`Seeding Table: ${tableName}`)

      if (dryRun) {
        this.dryRun(chunks, params)
        return
      }

      await dbConnection.query("BEGIN")

      if (resetBy && Object.keys(resetBy).length > 0) {
        await dbConnection.query(this.resetQuery(params))
      }

      for (const chunk of chunks) {
        const query = this.upsertQuery({ ...params, seed: { ...seed, data: chunk } })
        await dbConnection.query(query)
        for (const row of chunk) {
          this.logEvent(params, row)
        }
      }

      await dbConnection.query("COMMIT")
      // eslint-disable-next-line no-console
      console.log(`Seeding successfully finished`)
    } catch (error) {
      if (!dryRun) {
        await dbConnection.query("ROLLBACK")
      }
      // eslint-disable-next-line no-console
      console.log(error)
      if (error instanceof Error || error instanceof Exception) {
        this.logger.logError(error)
      } else {
        this.logger.logError(new Error(String(error)))
      }
    }
  }

  private dryRun(chunks: object[][], params: SeederServiceParams) {
    for (const chunk of chunks) {
      for (const row of chunk) {
        this.logEvent(params, row)
      }
    }
  }

  private upsertQuery(params: SeedTableParams): string | boolean {
    const { seed } = params
    const { tableName, data, primaryKeys } = seed

    if (!data.length) {
      return ""
    }

    return data
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
          if (!primaryKeys) {
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
              return `ON CONFLICT (${conflictKeys}) DO UPDATE SET ${conflictValues}`
            } else {
              return `ON CONFLICT (${conflictKeys}) DO NOTHING`
            }
          }
        }

        return `${insertColumnsString} ${insertValuesString} ${conflictString()};`
      })
      .join("\n")
  }

  private resetQuery(params: SeedTableParams): string {
    const { seed } = params
    const { tableName, resetBy } = seed

    if (!resetBy || Object.keys(resetBy).length === 0) {
      return ""
    }

    const deleteConditions = Object.entries(resetBy).map(([key, value]) => {
      if (Array.isArray(value)) {
        const values = value.map((v) => encodeValue(v)).join(",")
        return `"${key}" IN (${values})`
      }
      return `"${key}" = ${encodeValue(value)}`
    })

    return `DELETE FROM "${tableName}" WHERE ${deleteConditions.join(" AND ")}`
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private logEvent(params: SeederServiceParams, row: Record<string, any>): void {
    // this.logger.event(__filename, params.envName, row, "seed", { tenantId: row?.tenantId })
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}
