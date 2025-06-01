import { LoggerHelper } from "../LoggerHelper" // Adjust path if needed

describe("LoggerHelper.myconcat", () => {
  it("filters out null, undefined, and empty strings", () => {
    const result = LoggerHelper.myconcatEssentialData(null, undefined, "", "hello", 0, false)
    expect(result).toMatchInlineSnapshot(`"hello | 0 | false"`)
  })

  it('joins primitives with " | "', () => {
    const result = LoggerHelper.myconcatEssentialData("a", 1, true)
    expect(result).toMatchInlineSnapshot(`"a | 1 | true"`)
  })

  it("formats a simple object correctly", () => {
    const result = LoggerHelper.myconcatEssentialData({ a: 1, b: "two" })
    expect(result).toMatchInlineSnapshot(`"a: 1 | b: two"`)
  })

  it("formats nested objects as {nestedObject}", () => {
    const result = LoggerHelper.myconcatEssentialData({ a: { nested: true }, b: "val" })
    expect(result).toMatchInlineSnapshot(`"b: val"`)
  })

  it("truncates objects with more than 10 keys", () => {
    const bigObj = {
      k1: 1,
      k2: 2,
      k3: 3,
      k4: 4,
      k5: 5,
      k6: 6,
      k7: 7,
      k8: 8,
      k9: 9,
      k10: 10,
      k11: 11,
      k12: 12,
    }
    const result = LoggerHelper.myconcatEssentialData(bigObj)
    expect(result).toContain("k1: 1")
    expect(result).toContain("k10: 10")
    expect(result).not.toContain("k11: 11")
    expect(result).toContain("...all fields beyond the first 10 are omitted")
    expect(result).toMatchInlineSnapshot(
      `"k1: 1 | k2: 2 | k3: 3 | k4: 4 | k5: 5 | k6: 6 | k7: 7 | k8: 8 | k9: 9 | k10: 10 | ...all fields beyond the first 10 are omitted, please make a more narrow context for the event..."`
    )
  })

  it("combines objects and primitives", () => {
    const result = LoggerHelper.myconcatEssentialData("start", { a: 1 }, 42)
    expect(result).toMatchInlineSnapshot(`"start | a: 1 | 42"`)
  })

  it("returns an empty string if all arguments are filtered out", () => {
    const result = LoggerHelper.myconcatEssentialData(null, undefined, "")
    expect(result).toMatchInlineSnapshot(`""`)
  })
})
