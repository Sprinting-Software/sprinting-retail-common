/* eslint-disable prefer-template */
import util from "util"

export const StringUtils = {
  /**
   * A safe version of JSON.stringify that can handle BigInt values.
   * Also, if an exception occurs during stringification, it falls back to using util.inspect.
   * This will not work if you need valid json output.
   * @param value
   * @param indent
   * @returns
   */
  stringifySafeWithFallback: (value: any, indent?: number): string => {
    try {
      return StringUtils.stringifySafe(value, indent)
    } catch (error) {
      return `JSON.stringify FAILED. USING util.inspect instead: ${util.inspect(value, true)}`
    }
  },
  stringifySafe: (value: any, indent?: number): string => JSON.stringify(value, BIG_INT_REPLACER, indent),
  randomString: function (length = 10, chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    return new Array(length)
      .fill("")
      .map(() => {
        return chars[Math.floor(Math.random() * chars.length)]
      })
      .join("")
  },

  randomEasyString: function (length = 10, chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ") {
    return new Array(length)
      .fill("")
      .map(() => {
        return chars[Math.floor(Math.random() * chars.length)]
      })
      .join("")
  },
  /**
   * Recursively redacts sensitive information in an object for logging purposes,
   * and truncates overly long strings and arrays (including array-likes),
   * with the option to mark specific fields as pruned in the output.
   *
   * It looks for these fields (case-insensitive, ignoring spaces, hyphens, and underscores)
   * and replaces their values with the string 'REDACTED' whenever the normalized
   * key contains any of:
   *   - password
   *   - passphrase
   *   - secret
   *   - token
   *   - apikey
   *   - accesstoken
   *   - authtoken
   *
   * Additionally:
   *   - Strings longer than 500 characters are truncated to 500 chars and appended
   *     with '...(TRUNCATED FROM LENGTH XXX)' where XXX is the original length.
   *   - Arrays or array-likes longer than 100 elements are cut to the first 100, then an extra entry
   *     'TRUNCATED FROM LENGTH XXX' is appended to indicate how many items were omitted.
   *   - Any field whose name (normalized) appears in `excludeFields` is included
   *     in the output with the value `'PRUNED'`.
   *
   * @param input Any value (object, array, primitive) to be processed.
   * @param excludeFields Optional array of field names (in any case/format) which should
   *                      be marked as pruned.
   * @returns A deep-cloned version of `input` with sensitive fields redacted,
   *          long data structures truncated, and excluded fields marked `'PRUNED'`.
   */
  redactAndTruncateForLogging(input: any, excludeFields: string[] = []): any {
    const sensitiveWords = ["password", "passphrase", "secret", "token", "apikey", "accesstoken", "authtoken"]

    // Normalize a key by lowercasing and stripping spaces, hyphens, underscores
    const normalize = (key: string): string => key.toLowerCase().replace(/[\s\-_]/g, "")

    // Build a set of normalized field names to prune
    const excludeSet = new Set(excludeFields.map(normalize))

    function _process(value: any): any {
      // 1) Strings: truncate if over 500 chars
      if (typeof value === "string") {
        if (value.length > 500) {
          return value.slice(0, 500) + `...(TRUNCATED FROM LENGTH ${value.length})`
        }
        return value
      }

      // 2) True arrays: recurse & truncate
      if (Array.isArray(value)) {
        return truncateArray(value)
      }

      // 3) Array-likes (TypedArrays, Node buffers, etc.):
      //    objects with a numeric length and only numeric keys.
      if (
        value != null &&
        typeof value === "object" &&
        typeof (value as any).length === "number" &&
        Object.keys(value).every((k) => /^\d+$/.test(k) || k === "length")
      ) {
        const length: number = (value as any).length
        const arr: any[] = []
        for (let i = 0; i < length; i++) {
          arr.push(_process((value as any)[i]))
        }
        return truncateArray(arr, length)
      }

      // 4) Plain objects: deep-clone, mark pruned, redact sensitive, recurse
      if (value != null && typeof value === "object") {
        const out: Record<string, any> = {}
        for (const [rawKey, rawVal] of Object.entries(value)) {
          const normKey = normalize(rawKey)

          // Mark pruned if in excludeFields
          if (excludeSet.has(normKey)) {
            out[rawKey] = "PRUNED"
            continue
          }

          // Redact any key containing sensitive words
          if (sensitiveWords.some((sw) => normKey.includes(sw))) {
            out[rawKey] = "REDACTED"
          } else {
            // Otherwise recurse
            out[rawKey] = _process(rawVal)
          }
        }
        return out
      }

      // 5) Primitives (number, boolean, null, undefined, symbol, function)
      return value
    }

    /** Helper to truncate arrays down to 100 items + a tail marker */
    function truncateArray(arr: any[], origLen: number = arr.length): any[] {
      const limit = 100
      const sliced = arr.slice(0, limit).map((item) => _process(item))
      if (origLen > limit) {
        sliced.push(`TRUNCATED FROM LENGTH ${origLen}`)
      }
      return sliced
    }

    // Start processing from root
    return _process(input)
  },

  /**
   * Will ensure that the final string is no longer than the specified length, including the suffix.
   * @param str
   * @param length
   * @param suffix
   * @returns
   */
  truncate(str: string, length = 100, suffix = "...TRUNCATED..."): string {
    if (str.length <= length) return str
    const suffixLength = suffix.length
    const maxLength = length - suffixLength
    if (maxLength <= 0) return suffix // If the length is too short, just return the suffix
    return str.slice(0, maxLength) + suffix
  },

  /**
   * Returns a prettyUuid on the format 9000...m-0000-4000-8000-000...n such as
   * 1:  90000000-0000-4000-8000-000000000001
   * 33: 90000000-0000-4000-8000-000000000033
   * @param lastPart - the last digit
   * @param firstPart - the first digit - optional
   * @returns
   */
  prettyUid: function (lastPart: number, firstPart?: number): string {
    let firstNStr

    if (firstPart === undefined || firstPart === 0) {
      firstNStr = "90000000" // Default when firstPart is missing or zero
    } else {
      const firstPartStr = firstPart.toString()
      if (firstPartStr.length < 8) {
        firstNStr = "9" + firstPartStr.padStart(7, "0") // Ensure it starts with '9' and is 8 chars
      } else {
        firstNStr = firstPartStr.slice(0, 8) // Take the first 8 digits
      }
    }

    const lastNStr = lastPart.toString().padStart(12, "0")

    return `${firstNStr}-0000-4000-8000-${lastNStr}`
  },

  prettyUidWithRandomFirstPart: function (lastPart: number) {
    const randomInt = StringUtils.randomIntegerNumber(1000000, 9999999)
    const firstNStr = randomInt.toString().padStart(7, "0")
    const lastNStr = lastPart?.toString().padStart(12, "0") ?? "000000000000"
    return `9${firstNStr}-0000-4000-8000-${lastNStr}`
  },

  /**
   * Replaces occurrences of UUIDs in a string with another string.
   * You can replace different places with different strings.
   * @param stringWithUidsInside
   * @param replaceWith - either a string or an array of strings. If a string, it will be used to replace all occurrences.
   * If an array, it will be used to replace the occurrences at the same index. If more occurrences than strings in the array,
   * the last string will be used for the remaining occurrences.
   */
  replaceUid: function (stringWithUidsInside: string, replaceWith: string[] | string = "UUID"): string {
    const uidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
    let occurrenceIndex = 0

    // If replaceWith is a single string, do a simple global replace.
    if (typeof replaceWith === "string") {
      return stringWithUidsInside.replace(uidRegex, replaceWith)
    }

    // Otherwise, replaceWith is an array of strings
    return stringWithUidsInside.replace(uidRegex, () => {
      // Choose the replacement string by current occurrence index
      const replacement =
        occurrenceIndex < replaceWith.length ? replaceWith[occurrenceIndex] : replaceWith[replaceWith.length - 1]

      occurrenceIndex += 1
      return replacement
    })
  },

  isUid: function (val: string): boolean {
    const uidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
    return uidRegex.test(val)
  },
  isIntegerString: function (str: string) {
    const num = Number(str)
    return Number.isInteger(num) && str.trim() !== ""
  },

  randomIntegerNumber: function (min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min + 1) + min)
  },
  /**
   * Returns a random integer with a specified number of digits
   * @param length
   * @returns
   */
  randomIntegerWithLength: function (length = 8) {
    return StringUtils.randomIntegerNumber(10 ** (length - 1), 10 ** length - 1)
  },

  capitalizeFirstChar: function (str: string): string {
    if (!str) return str // return the string as-is if it's empty
    return str.charAt(0).toUpperCase() + str.slice(1)
  },

  /**
   * Masks emails like this:
   * abc@efg.com -> abc@
   * fsadfsdfds@sdfsdafds.dk -> fsadfsdfds@
   * @param string
   * @returns
   */
  maskEmail: function (email?: string | undefined | null): string | undefined {
    if (!email) return undefined
    return email.replace(/^(.)(.*)(.@.*)$/, (_, first, middle, domain) => first + "*".repeat(middle.length) + domain)
  },
  stringifyAllFields: function (obj: any) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        try {
          return [key, JSON.stringify(value)]
        } catch {
          return [key, "" + value + " (error during stringify)"]
        }
      })
    )
  },
  /**
   * Formats an object nicely for logging purposes.
   * Example:
   * { a: undefined, b: "xxx", c: { d1: "e1", d2: "e2" } } -> "a: undefined, b: xxx, c.d1: e1, c.d2: e2"
   * @param obj
   * @returns string
   */
  prettyLog: function (obj: any): string {
    function getUndefinedValues(arg: any): string | null {
      if (arg === undefined) return "undefined"
      if (arg === null) return "null"
      if (arg === "") return "EMPTY STRING"
      if (typeof arg === "string" && arg.trim() === "") return "WHITESPACE"
      return null
    }

    function flatten(obj: any, prefix = "", depth = 0): string[] {
      if (depth > 2) return [`${prefix}: ...`] // Depth limit

      const specialValue = getUndefinedValues(obj)
      if (specialValue) return [`${prefix}: ${specialValue}`]

      if (typeof obj !== "object" || obj === null) {
        return [`${prefix}: ${obj.toString()}`]
      }

      return Object.entries(obj).flatMap(([key, value]) => flatten(value, prefix ? `${prefix}.${key}` : key, depth + 1))
    }

    return flatten(obj).join(", ")
  },

  /**
   * Used to create shorter and more handy ids for UUIDs.
   * The purpose is to minimize the risk of collision while still being able to identify the id
   * and while still having a fairly short id.
   * @param uid
   * @returns
   */
  shortenUidForLogs: function (uid: string) {
    if (!uid) return uid
    if (uid.indexOf("-") === -1) return uid // If it is not a UUID, we will just return it as-is
    const numberOfZeros = uid.match(/0/g)?.length
    // Check if it is an artifial UUID meaning it has "many" 0s, we will just count the number of 0s and if it has more than 5, we will consider it artificial
    const isArtificial = numberOfZeros && numberOfZeros > 5
    if (isArtificial) {
      // Return the first part of the UUID and the last part but removing 0s of the last part.
      const parts = uid.split("-")
      const firstPart = parts[0]
      const lastPart = parts[4].replace(/0/g, "")
      return `${firstPart}X${lastPart}`
    }
    return uid.split("-")[0]
  },

  /**
   * Returns like this:
   * abcdefg@xyzxxx.com -> a6@e5.com
   * a@hotmail.com -> a@h6.com
   * peter@d.com -> p4@.com
   * In other words:
   * - the first letter of the first part followed by the number of characters coming after it (like in i18n)
   * - the second part with the first letter, again followed by the number of characters coming after it
   * - the full domain
   * @param email
   * @returns
   */
  maskEmailForLogs: function (
    email: string | undefined | null,
    firstVisible = 2,
    domainVisible = 3
  ): string | undefined {
    if (!email) return undefined

    const parts = email.split("@")
    if (parts.length !== 2) return email // If not a valid email, return as-is

    const [firstPart, domain] = parts
    const domainParts = domain.split(".") // Support multi-level domains

    // Ensure values do not exceed string length
    const firstKeep = Math.min(firstVisible, firstPart.length)
    const domainKeep = Math.min(domainVisible, domainParts[0].length)

    // Mask first part
    const firstPartMasked =
      firstPart.substring(0, firstKeep) + (firstPart.length > firstKeep ? firstPart.length - firstKeep : "")

    // Mask domain, preserving `domainVisible` characters from the first part
    const domainMasked = domainParts
      .map((part, index) =>
        index === domainParts.length - 1 // Keep last domain part unchanged
          ? part
          : part.substring(0, domainKeep) + (part.length > domainKeep ? part.length - domainKeep : "")
      )
      .join(".")

    return `${firstPartMasked}@${domainMasked}`
  },
  /**
   * Creates the BASIC auth header value.
   * @param username
   * @param password
   * @returns
   */
  basicAuth: (username: string, password: string) => {
    return "Basic " + Buffer.from(username + ":" + password).toString("base64")
  },

  /**
   * Returns a unique file name based on the original file name.
   * It appends a random easily readable alphanumeric lowercase string of length 10 to the file name before the extension.
   * This is useful to avoid collisions when uploading files with the same name.
   * Format is:
   * <originalFileName>-<randomUid>.<extension>
   * @param originalFileName
   * @returns
   */
  makeUniqueFileName(originalFileName: string): {
    extension: string
    fileNameUniqueWithoutExtension: string
    fileNameUniqueWithExtension: string
  } {
    const lastIndex = originalFileName.lastIndexOf(".")
    const fileWithoutExt = originalFileName.substring(0, lastIndex)
    const extension = originalFileName.substring(lastIndex + 1)
    // Create a file descriptor with the resource type and resource id
    const fileNameUniqueWithoutExtension = `${fileWithoutExt}-${this.randomEasyString(10).toLowerCase()}`
    const fileNameUniqueWithExtension = `${fileNameUniqueWithoutExtension}.${extension}`
    return { extension, fileNameUniqueWithoutExtension, fileNameUniqueWithExtension }
  },
}
const BIG_INT_REPLACER: (this: any, key: string, value: any) => any = (key, value) =>
  typeof value === "bigint"
    ? value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER
      ? Number(value) // ✅ safe to convert
      : value.toString() // ❗ too big — convert to string
    : value
