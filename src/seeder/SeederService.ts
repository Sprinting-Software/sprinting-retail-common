import { Injectable } from "@nestjs/common"
import { LoggerService } from "../logger/LoggerService"
import { Exception } from "../errorHandling/exceptions/Exception"
import { encodeValue } from "../helpers/SeederHelper"
import * as fs from "fs"
import * as path from "path"

type DbConnection = any

export interface SeedParams {
  tableName: string
  primaryKeys: string[]
  data: object[]
  resetBy?: Record<string, any>
  filterByKey?: string
}

export interface SeederServiceParams {
  systemName: string
  envName: string
  dbConnection: DbConnection
  path: string
  dryRun?: boolean
  jsonOrders?: string[]
  filterByJenkinsParams?: number[]
}

export type SeedTableParams = SeederServiceParams & { seed: SeedParams }

@Injectable()
export class SeederService {
  constructor(private readonly logger: LoggerService) {}

  private readonly chunkSize = 50

  async seeds(params: SeederServiceParams): Promise<void> {
    const { systemName, envName, path: dirPath, jsonOrders } = params

    this.logger.info(__filename, `Seeding started. System: ${systemName}, Env: ${envName}`)

    if (jsonOrders && jsonOrders.length > 0) {
      for (const jsonFile of jsonOrders) {
        const filePath = path.join(dirPath, jsonFile)
        if (fs.existsSync(filePath)) {
          await this.processJsonFile(params, filePath)
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

  private async processJsonFile(params: SeederServiceParams, filePath: string): Promise<void> {
    const fileContent = fs.readFileSync(filePath, "utf-8")
    const seedParams: SeedParams = JSON.parse(fileContent)
    if (params?.filterByJenkinsParams && params?.filterByJenkinsParams.length > 0) {
      const filterKey = seedParams?.filterByKey || "tenantId"
      seedParams.data = seedParams.data.filter((item) => params?.filterByJenkinsParams.includes(item[filterKey]))
    }

    await this.seedItem({ ...params, seed: seedParams })
  }

  async seeds1(params: SeederServiceParams): Promise<void> {
    const { path: dirPath, jsonOrders } = params

    if (jsonOrders && jsonOrders.length > 0) {
      for (const jsonFile of jsonOrders) {
        const filePath = path.join(dirPath, jsonFile)
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, "utf-8")
          const seedParams: SeedParams = JSON.parse(fileContent)
          await this.seedItem({ ...params, seed: seedParams })
        }
      }
    } else {
      const files = fs.readdirSync(dirPath)

      for (const file of files) {
        if (path.extname(file) === ".json") {
          const filePath = path.join(dirPath, file)
          const fileContent = fs.readFileSync(filePath, "utf-8")
          const seedParams: SeedParams = JSON.parse(fileContent)
          await this.seedItem({ ...params, seed: seedParams })
        }
      }
    }
  }

  async seedItem(params: SeedTableParams): Promise<void> {
    const chunks = this.chunkArray(params.seed.data, this.chunkSize)
    const { dbConnection, seed, systemName, envName, dryRun = false } = params
    const { tableName, resetBy } = seed

    try {
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

  private resetQuery(params: SeedTableParams): string {
    const { seed } = params
    const { tableName, resetBy, data, primaryKeys } = seed

    if (!resetBy || Object.keys(resetBy).length === 0 || !primaryKeys || primaryKeys.length === 0) {
      return ""
    }

    const primaryKeysValues = primaryKeys.reduce((acc, key) => {
      acc[key] = [...new Set(data.map((item) => item[key]))]
      return acc
    }, {} as Record<string, any[]>)

    const deleteConditions = Object.entries(resetBy)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          const values = value.map((v) => encodeValue(v)).join(",")
          return `"${key}" IN (${values})`
        }
        return `"${key}" = ${encodeValue(value)}`
      })
      .concat(
        Object.entries(primaryKeysValues).map(([key, values]) => {
          const encodedValues = values.map((v) => encodeValue(v)).join(",")
          return `"${key}" NOT IN (${encodedValues})`
        })
      )
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
