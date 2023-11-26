import path from "path"
import fs from "fs"

interface AutoSeedItemsParams {
  dirPath: string
  tenantIds: number[]
  seedTablesList: Record<string, any>
  replaceArrayColumn: Record<string, any>
}

export class SeederHelper {
  static replaceTenantId(obj: any, tenantId: number): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => SeederHelper.replaceTenantId(item, tenantId))
    } else if (typeof obj === "object" && obj !== null) {
      for (const key in obj) {
        if (key === "tenantId") {
          obj[key] = tenantId
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          SeederHelper.replaceTenantId(obj[key], tenantId)
        }
      }
    }
    return obj
  }

  static extractTableFromFileName(filename: string): string {
    return filename.split("_")[1].split(".")[0]
  }

  static replaceArrayColumn(data: any, replaceArrayColumn: string[]) {
    return data.map((item) => {
      for (const column in item) {
        if (replaceArrayColumn.includes(column) && item[column] && Array.isArray(item[column])) {
          if (item[column].length === 0) {
            item[column] = "{}"
          } else {
            item[column] = `{${item[column].join(",")}}`
          }
        }
      }
      return item
    })
  }

  static sortTablesOrder(filesTables: string[], orderTables: string[]) {
    return filesTables.sort((a, b) => {
      const keyA = SeederHelper.extractTableFromFileName(a)
      const keyB = SeederHelper.extractTableFromFileName(b)

      const orderA = orderTables.indexOf(keyA)
      const orderB = orderTables.indexOf(keyB)

      if (orderA === -1) return 1
      if (orderB === -1) return -1

      return orderA - orderB
    })
  }

  static getAutoSeedItems({ dirPath, tenantIds, seedTablesList, replaceArrayColumn }: AutoSeedItemsParams): any[] {
    const items: any[] = []
    const tenantsFiles: Record<string, string[]> = {}
    const files: string[] = fs.readdirSync(dirPath, "utf-8")
    for (const file of files) {
      const fileNameParts = file.split("_")
      if (!fileNameParts || fileNameParts.length !== 2) {
        continue
      }

      const tenantId = +fileNameParts[0]
      if (Number.isNaN(tenantId) || !tenantIds.includes(tenantId)) {
        continue
      }

      tenantsFiles[tenantId] = tenantsFiles[tenantId] || []
      tenantsFiles[tenantId].push(file)
    }

    for (const tenantId of Object.keys(tenantsFiles)) {
      const orderedFiles = SeederHelper.sortTablesOrder(tenantsFiles[tenantId], Object.keys(seedTablesList))

      for (const file of orderedFiles) {
        try {
          const filePath = path.join(dirPath, file)
          const fileContent = fs.readFileSync(filePath, "utf-8")
          const data = JSON.parse(fileContent)
          const tableName = SeederHelper.extractTableFromFileName(file)
          const itemStructure = { ...seedTablesList[tableName] }
          if (itemStructure?.resetBy?.tenantId === "replaceTenantId") {
            itemStructure.resetBy.tenantId = tenantId
          }
          let replaceData = SeederHelper.replaceTenantId(data, +tenantId)
          if (replaceArrayColumn && Object.keys(replaceArrayColumn).includes(tableName)) {
            replaceData = SeederHelper.replaceArrayColumn(replaceData, replaceArrayColumn[tableName])
          }
          itemStructure.data = replaceData
          items.push(itemStructure)
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Error while parsing file ${file}: ${error}`)
        }
      }
    }

    return items
  }
}
