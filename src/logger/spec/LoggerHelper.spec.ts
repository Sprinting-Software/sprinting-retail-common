import { eventMessage, LoggerHelper } from "../LoggerHelper" // Adjust path if needed

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

describe("LoggerHelper.buildEventMessage", () => {
  const context = {
    orderId: "0a24dac1-a701-4932-8a77-b4303902de76",
    orderNumber: "BI0001258",
    status: "confirmed",
    totalAmountCents: 436930,
    dryRun: false,
    note: "x".repeat(61),
    nested: { a: 1 },
    list: [1],
    at: new Date(0),
    empty: "",
  }

  it("shows the given scalar fields in that order, leaving out objects, arrays, dates, empty, long and unknown values", () => {
    expect(LoggerHelper.buildEventMessage("OrderConfirmed", [...Object.keys(context), "unknown"], context)).toBe(
      "EVENT: OrderConfirmed - orderId: 0a24dac1-a701-4932-8a77-b4303902de76, orderNumber: BI0001258, status: confirmed, totalAmountCents: 436930, dryRun: false"
    )
    expect(LoggerHelper.buildEventMessage("OrderConfirmed", ["status", "orderNumber"], context)).toBe(
      "EVENT: OrderConfirmed - status: confirmed, orderNumber: BI0001258"
    )
  })

  it("takes each field from the first source that has it", () => {
    expect(
      LoggerHelper.buildEventMessage(
        "E",
        ["a", "b", "c"],
        { a: "data" },
        { a: "context", b: "context" },
        { c: "custom" }
      )
    ).toBe("EVENT: E - a: data, b: context, c: custom")
  })

  it("is at most 500 characters, also with a long list of fields", () => {
    const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`attribute${i}`, `value-${i}`]))
    const message = LoggerHelper.buildEventMessage("OrderAltered", Object.keys(many), many)

    expect(message.length).toBeLessThanOrEqual(500)
    expect(message).toMatch(/^EVENT: OrderAltered - attribute0: value-0, .*, …$/)
  })

  it("is EVENT and the event name alone when no field has a value", () => {
    expect(LoggerHelper.buildEventMessage("OrderConfirmed", ["orderNumber"])).toBe("EVENT: OrderConfirmed")
  })
})

describe("eventMessage", () => {
  const event = { name: "OrderConfirmed", category: "Order", domain: "Orders", data: { orderNumber: "B1" } }

  it("is the caller's message, the composed fields, or EVENT with name, category and domain", () => {
    expect(eventMessage(event, "custom")).toBe("custom")
    expect(eventMessage(event, { concatFields: ["orderNumber"] })).toBe("EVENT: OrderConfirmed - orderNumber: B1")
    expect(eventMessage(event, undefined)).toBe("EVENT: OrderConfirmed Order Orders")
    expect(eventMessage(event, "")).toBe("EVENT: OrderConfirmed Order Orders")
  })
})
