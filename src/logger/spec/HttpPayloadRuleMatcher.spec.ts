import { HttpPayloadLogRule } from "../../config/interface/LibConfig"
import { matchHttpPayloadRule } from "../HttpPayloadRuleMatcher"

describe("matchHttpPayloadRule", () => {
  const baseInput = {
    direction: "outbound" as const,
    method: "GET",
    domain: "api.sprinting.io",
    path: "/api/v2/orders/123",
  }

  it("returns undefined when there are no rules", () => {
    expect(matchHttpPayloadRule(undefined, baseInput)).toBeUndefined()
    expect(matchHttpPayloadRule([], baseInput)).toBeUndefined()
  })

  it("matches an exact domain and path", () => {
    const rule: HttpPayloadLogRule = {
      direction: "outbound",
      domain: "api.sprinting.io",
      path: "/api/v2/orders/123",
      samplingRate: 1,
    }
    expect(matchHttpPayloadRule([rule], baseInput)).toBe(rule)
  })

  it("does not match a different direction", () => {
    const rule: HttpPayloadLogRule = { direction: "inbound", domain: "*", path: "*", samplingRate: 1 }
    expect(matchHttpPayloadRule([rule], baseInput)).toBeUndefined()
  })

  it("matches wildcard domains", () => {
    const rule: HttpPayloadLogRule = { direction: "outbound", domain: "*.sprinting.io", path: "*", samplingRate: 1 }
    expect(matchHttpPayloadRule([rule], baseInput)).toBe(rule)
    expect(matchHttpPayloadRule([rule], { ...baseInput, domain: "other.io" })).toBeUndefined()
  })

  it("matches wildcard paths", () => {
    const rule: HttpPayloadLogRule = {
      direction: "outbound",
      domain: "api.sprinting.io",
      path: "/api/v2/orders/*",
      samplingRate: 1,
    }
    expect(matchHttpPayloadRule([rule], baseInput)).toBe(rule)
    expect(matchHttpPayloadRule([rule], { ...baseInput, path: "/api/v2/customers/123" })).toBeUndefined()
  })

  it("matches a specific method case-insensitively, or any method when omitted or '*'", () => {
    const getRule: HttpPayloadLogRule = {
      direction: "outbound",
      domain: "*",
      path: "*",
      method: "get",
      samplingRate: 1,
    }
    expect(matchHttpPayloadRule([getRule], baseInput)).toBe(getRule)
    expect(matchHttpPayloadRule([getRule], { ...baseInput, method: "POST" })).toBeUndefined()

    const anyMethodRule: HttpPayloadLogRule = {
      direction: "outbound",
      domain: "*",
      path: "*",
      method: "*",
      samplingRate: 1,
    }
    expect(matchHttpPayloadRule([anyMethodRule], { ...baseInput, method: "POST" })).toBe(anyMethodRule)

    const noMethodRule: HttpPayloadLogRule = { direction: "outbound", domain: "*", path: "*", samplingRate: 1 }
    expect(matchHttpPayloadRule([noMethodRule], { ...baseInput, method: "DELETE" })).toBe(noMethodRule)
  })

  it("returns the first matching rule when several would match", () => {
    const first: HttpPayloadLogRule = { direction: "outbound", domain: "*", path: "*", samplingRate: 0.1 }
    const second: HttpPayloadLogRule = { direction: "outbound", domain: "*", path: "*", samplingRate: 0.9 }
    expect(matchHttpPayloadRule([first, second], baseInput)).toBe(first)
  })

  it("escapes regex-special characters in domain/path other than *", () => {
    const rule: HttpPayloadLogRule = {
      direction: "outbound",
      domain: "api.sprinting.io",
      path: "/api/v2/orders/123",
      samplingRate: 1,
    }
    // A literal dot must not act as a regex wildcard.
    expect(matchHttpPayloadRule([rule], { ...baseInput, domain: "apiXsprintingXio" })).toBeUndefined()
  })
})
