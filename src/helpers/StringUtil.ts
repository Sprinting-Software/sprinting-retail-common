import util from "util"

export const StringUtil = {
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
      return StringUtil.stringifySafe(value, indent)
    } catch (error) {
      return `JSON.stringify FAILED. USING util.inspect instead: ${util.inspect(value, true)}`
    }
  },
  stringifySafe: (value: any, indent?: number): string => JSON.stringify(value, BIG_INT_REPLACER, indent),
}
const BIG_INT_REPLACER: (this: any, key: string, value: any) => any = (key, value) =>
  typeof value === "bigint"
    ? value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER
      ? Number(value) // ✅ safe to convert
      : value.toString() // ❗ too big — convert to string
    : value
