const MAX_NUMBER_OF_FIELDS_IN_CONTEXT = 30

/**
 * Concatenates arguments using this logic:
 * - Filter out any falsy values (null, undefined, empty strings)
 * - Join the remaining values with " | "
 * - If one of the arguments passed is an object, use this logic:
 *    - The first level of fields will be iterated and written out as "key: value" with comma-separation.
 *    - For nested objects, skip them
 *    - For Date objects, skip them
 *    - If more than MAX_NUMBER_OF_FIELDS_IN_CONTEXT fields are found, write out "...all fields beyond the first MAX_NUMBER_OF_FIELDS_IN_CONTEXT are omitted, please make a more narrow context for the event..."
 *    - Any empty strings, nulls, or undefined values will be skipped
 * @param args Any arguments to concatenate
 * @returns
 */
export const LoggerHelper = {
  myconcatEssentialData(...args: any[]): string {
    const filteredArgs = args.filter((arg) => arg !== null && arg !== undefined && arg !== "")

    const resultParts: string[] = []

    for (const arg of filteredArgs) {
      if (typeof arg === "object" && arg !== null && !Array.isArray(arg)) {
        const keys = Object.keys(arg)
        const shownKeys = keys.slice(0, MAX_NUMBER_OF_FIELDS_IN_CONTEXT)
        const objectParts = shownKeys
          .map((key) => {
            const value = arg[key]
            if (value === null || value === undefined) {
              return undefined
            } else if (value instanceof Date) {
              return undefined
            } else if (typeof value === "object" && value !== null) {
              return undefined
            } else {
              return `${key}: ${value}`
            }
          })
          .filter((part) => part) //Remove any undefined parts
        if (keys.length > 10) {
          objectParts.push(
            "...all fields beyond the first 10 are omitted, please make a more narrow context for the event..."
          )
        }

        resultParts.push(objectParts.join(" | "))
      } else {
        resultParts.push(String(arg))
      }
    }

    return resultParts.join(" | ")
  },
}
