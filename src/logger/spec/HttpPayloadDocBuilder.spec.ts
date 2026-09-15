import { ApmHelper } from "../../apm/ApmHelper"
import { buildHttpPayloadDocument } from "../HttpPayloadDocBuilder"

describe("buildHttpPayloadDocument", () => {
  const call = { direction: "outbound" as const, method: "GET", domain: "api.sprinting.io", path: "/api/v2/orders/1" }
  const context = { serviceName: "TestSystemName", env: "prod" }

  afterEach(() => {
    jest.spyOn(Math, "random").mockRestore()
  })

  it("returns undefined when httpConfig is not provided", () => {
    expect(buildHttpPayloadDocument(call, undefined, context)).toBeUndefined()
  })

  it("returns undefined when no rule matches and the default sampling rate excludes this call", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9)
    const doc = buildHttpPayloadDocument(call, { defaultSamplingRate: 0.5, rules: [] }, context)
    expect(doc).toBeUndefined()
  })

  it("falls back to the default sampling rate when no rule matches", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(call, { defaultSamplingRate: 1, rules: [] }, context)
    expect(doc).toBeDefined()
  })

  it("a matching rule's sampling rate overrides the default, even when the default would exclude it", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(
      call,
      {
        defaultSamplingRate: 0,
        rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }],
      },
      context
    )
    expect(doc).toBeDefined()
  })

  it("builds a fully-shaped document and redacts sensitive fields when sampled", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(
      { ...call, statusCode: 200, payload: { password: "secret", orderId: "o-1" } },
      { defaultSamplingRate: 0, rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }] },
      context
    )

    expect(doc).toMatchObject({
      direction: "outbound",
      httpMethod: "GET",
      httpDomain: "api.sprinting.io",
      httpPath: "/api/v2/orders/1",
      httpRoute: "/api/v2/orders/1",
      statusCode: 200,
      success: true,
      logType: "httpPayload",
      httpLogType: "OutboundHttpCall",
      system: "TestSystemName",
      env: "prod",
      systemEnv: "prod-TestSystemName",
    })
    expect(doc.payload).toEqual(expect.objectContaining({ password: "REDACTED", orderId: "o-1" }))
  })

  it("uses an explicit route when provided instead of defaulting to path", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(
      { ...call, path: "/api/v2/orders/123", route: "/api/v2/orders/{id}" },
      { defaultSamplingRate: 1, rules: [] },
      context
    )
    expect(doc).toMatchObject({ httpPath: "/api/v2/orders/123", httpRoute: "/api/v2/orders/{id}" })
  })

  it("sets httpLogType to InboundHttpCall for inbound calls", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(
      { ...call, direction: "inbound" },
      { defaultSamplingRate: 1, rules: [] },
      context
    )
    expect(doc).toMatchObject({ direction: "inbound", httpLogType: "InboundHttpCall" })
  })

  it("omits payload when the matching rule sets logRequest: false", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(
      { ...call, payload: { a: 1 }, responsePayload: { b: 2 } },
      {
        defaultSamplingRate: 0,
        rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1, logRequest: false }],
      },
      context
    )
    expect(doc).not.toHaveProperty("payload")
    expect(doc.responsePayload).toEqual({ b: 2 })
  })

  it("omits responsePayload when the matching rule sets logResponse: false", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(
      { ...call, payload: { a: 1 }, responsePayload: { b: 2 } },
      {
        defaultSamplingRate: 0,
        rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1, logResponse: false }],
      },
      context
    )
    expect(doc.payload).toEqual({ a: 1 })
    expect(doc).not.toHaveProperty("responsePayload")
  })

  it("drops noise headers and redacts sensitive-word header values, but passes authorization through untouched", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(
      {
        ...call,
        headers: {
          Host: "api.sprinting.io",
          Authorization: "Bearer md5:already-masked",
          "x-api-key": "raw-secret",
          "x-request-id": "req-1",
        },
      },
      { defaultSamplingRate: 1, rules: [] },
      context
    )
    expect(doc.headers).toEqual({
      Authorization: "Bearer md5:already-masked",
      "x-api-key": "REDACTED",
      "x-request-id": "req-1",
    })
  })

  it("appends the status code to the message when present", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument({ ...call, statusCode: 200 }, { defaultSamplingRate: 1, rules: [] }, context)
    expect(doc.message).toBe("GET api.sprinting.io/api/v2/orders/1 -> 200")
  })

  it("appends the error to the message when there is no status code", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(
      { ...call, error: "socket hang up" },
      { defaultSamplingRate: 1, rules: [] },
      context
    )
    expect(doc.message).toBe("GET api.sprinting.io/api/v2/orders/1 -> socket hang up")
  })

  it("omits the trailing arrow entirely when neither a status code nor an error is present", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(call, { defaultSamplingRate: 1, rules: [] }, context)
    expect(doc.message).toBe("GET api.sprinting.io/api/v2/orders/1")
  })

  it("does not include an InboundHttpCall/OutboundHttpCall prefix in the message - that's the httpLogType field", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(
      { ...call, direction: "inbound", statusCode: 200 },
      { defaultSamplingRate: 1, rules: [] },
      context
    )
    expect(doc.message).toBe("GET api.sprinting.io/api/v2/orders/1 -> 200")
    expect(doc.httpLogType).toBe("InboundHttpCall")
  })

  it("uses the caller-provided message verbatim when present, ignoring the auto-generated shape", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument(
      { ...call, statusCode: 200, message: "Fetched order 1 from Sprinting" },
      { defaultSamplingRate: 1, rules: [] },
      context
    )
    expect(doc.message).toBe("Fetched order 1 from Sprinting")
  })

  it("falls back to the auto-generated message when message is not provided", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    const doc = buildHttpPayloadDocument({ ...call, statusCode: 200 }, { defaultSamplingRate: 1, rules: [] }, context)
    expect(doc.message).toBe("GET api.sprinting.io/api/v2/orders/1 -> 200")
  })

  it("includes trace.id/transaction.id when there is a current APM transaction", () => {
    jest.spyOn(Math, "random").mockReturnValue(0)
    jest.spyOn(ApmHelper.Instance, "getApmAgent").mockReturnValue({
      currentTransaction: { ids: { "trace.id": "t-1", "transaction.id": "tx-1" } },
    } as any)

    const doc = buildHttpPayloadDocument(call, { defaultSamplingRate: 1, rules: [] }, context)

    expect(doc).toMatchObject({ "trace.id": "t-1", "transaction.id": "tx-1" })
    jest.spyOn(ApmHelper.Instance, "getApmAgent").mockRestore()
  })
})
