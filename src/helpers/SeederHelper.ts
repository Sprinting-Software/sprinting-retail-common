const escapeString = (string) => string.replace(/'/g, "''")
export const encodeValue = (value, options: any = {}) => {
  const { objectsToJsonb = false } = options

  if (typeof value === "string") {
    return `'${escapeString(value)}'`
  } else if (typeof value === "object" && value instanceof Date) {
    return `to_timestamp(${value.getTime()} / 1000.0)`
  } else if (typeof value === "object") {
    if (value === null) {
      return `null`
    } else {
      const jsonString = `'${escapeString(JSON.stringify(value))}'`
      if (objectsToJsonb) {
        return `${jsonString}::jsonb`
      } else {
        return jsonString
      }
    }
  } else {
    return value
  }
}
