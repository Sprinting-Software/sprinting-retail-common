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

  it("combines objects and primitives", () => {
    const result = LoggerHelper.myconcatEssentialData("start", { a: 1 }, 42)
    expect(result).toMatchInlineSnapshot(`"start | a: 1 | 42"`)
  })

  it("returns an empty string if all arguments are filtered out", () => {
    const result = LoggerHelper.myconcatEssentialData(null, undefined, "")
    expect(result).toMatchInlineSnapshot(`""`)
  })
})
