import { AsyncContext } from "../../asyncLocalContext/AsyncContext"
import * as winston from "winston"
import { ApmHelper } from "../../apm/ApmHelper"
import { LibTestConfig, LibTestConfigV9 } from "../../config/spec/TestConfig"
import { BulkLogService } from "../BulkLogService"
import { ElkV9LoggerService } from "../ElkV9LoggerService"

describe("ElkV9LoggerService", () => {
  it("enriches logs before bulk delivery", () => {
    const bulk = { log: jest.fn() } as unknown as BulkLogService
    const asyncContext = {
      getContextOrUndefined: () => ({ traceId: "trace-1", requestId: "request-1" }),
    } as AsyncContext
    const logger = new ElkV9LoggerService({ ...LibTestConfigV9, enableConsoleLogs: true }, bulk, asyncContext)
    const consoleLog = jest.spyOn(winston.transports.Console.prototype, "log").mockImplementation()

    logger.info("orders.service", "created", { orderId: "o-1" })

    expect(bulk.log).toHaveBeenCalledWith(
      expect.stringMatching(/^logs-.*-log$/),
      expect.objectContaining({
        filename: "orders.service",
        message: "created { orderId: 'o-1' }",
        labels: expect.objectContaining({ traceId: "trace-1", requestId: "request-1" }),
        service: { name: LibTestConfig.serviceName, environment: expect.any(String) },
        meta: { sentViaRestApi: true },
        "log.level": "info",
        timestamp: expect.any(String),
        "@timestamp": expect.any(String),
      })
    )
    expect(consoleLog.mock.calls[0][0]).toEqual(expect.objectContaining({ message: "created { orderId: 'o-1' }" }))
    expect((bulk.log as jest.Mock).mock.calls[0][1]).not.toHaveProperty("ecs.version")
    consoleLog.mockRestore()
  })

  it("uses an undated event data stream name", () => {
    const bulk = { log: jest.fn() } as unknown as BulkLogService
    const logger = new ElkV9LoggerService(LibTestConfigV9, bulk)

    logger.event("orders.service", "created", "order", "sales", {})

    expect(bulk.log).toHaveBeenCalledWith(expect.stringMatching(/^logs-.*-event$/), expect.any(Object))
  })

  it("uses env as given in data stream names", () => {
    const bulk = { log: jest.fn() } as unknown as BulkLogService
    const logger = new ElkV9LoggerService({ ...LibTestConfigV9, env: "p-bm20" }, bulk)

    logger.event("orders.service", "created", "order", "sales", {})
    logger.info("orders.service", "created")

    expect(bulk.log).toHaveBeenCalledWith(
      `logs-p-bm20-${LibTestConfig.serviceName}-event`.toLowerCase(),
      expect.any(Object)
    )
    expect(bulk.log).toHaveBeenCalledWith(
      `logs-p-bm20-${LibTestConfig.serviceName}-log`.toLowerCase(),
      expect.any(Object)
    )
  })

  it("writes env as the env of the document", () => {
    const bulk = { log: jest.fn() } as unknown as BulkLogService
    const logger = new ElkV9LoggerService({ ...LibTestConfigV9, env: "p-bm20" }, bulk)

    logger.event("orders.service", "created", "order", "sales", {})

    expect((bulk.log as jest.Mock).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        env: "p-bm20",
        systemEnv: `p-bm20-${LibTestConfig.serviceName}`,
        service: { name: LibTestConfig.serviceName, environment: "p-bm20" },
      })
    )
  })

  it("writes tenants as monikers only: no numeric tenantId or rootTenantId in labels", () => {
    const bulk = { log: jest.fn() } as unknown as BulkLogService
    const traceContext = {
      getContextOrUndefined: () => ({ tenantId: 21, tenant: "tid21", rootTenantId: 21, rootTenant: "tid21" }),
    } as AsyncContext
    new ElkV9LoggerService(LibTestConfigV9, bulk, traceContext).info("orders.service", "created")

    const labels = (bulk.log as jest.Mock).mock.calls[0][1].labels
    expect(labels).toEqual(expect.objectContaining({ tenant: "tid21", rootTenant: "tid21" }))
    expect(labels).not.toHaveProperty("tenantId")
    expect(labels).not.toHaveProperty("rootTenantId")
  })

  describe("event message", () => {
    const messageOf = (call: (logger: ElkV9LoggerService) => void) => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      call(new ElkV9LoggerService(LibTestConfigV9, bulk))
      return (bulk.log as jest.Mock).mock.calls[0][1].message
    }
    const context = { orderNumber: "BI0001258", status: "confirmed", shopId: "s-1" }

    it("is EVENT with name, category and domain by default", () => {
      expect(messageOf((l) => l.event("f", "OrderConfirmed", "c", "Orders", undefined, undefined, context))).toBe(
        "EVENT: OrderConfirmed c Orders"
      )
    })

    it("is composed from the concatFields of the event data, context and custom data, in that order", () => {
      expect(
        messageOf((l) =>
          l.event(
            "f",
            "OrderConfirmed",
            "c",
            "Orders",
            { orderNumber: "B1", status: "confirmed" },
            { concatFields: ["orderNumber", "status", "tenantId", "lineCount"] },
            { tenantId: 21, status: "pending" },
            { lineCount: 3 }
          )
        )
      ).toBe("EVENT: OrderConfirmed - orderNumber: B1, status: confirmed, tenantId: 21, lineCount: 3")
    })

    it("is the caller's message when given", () => {
      expect(messageOf((l) => l.event("f", "OrderConfirmed", "c", "Orders", undefined, "custom", context))).toBe(
        "custom"
      )
    })
  })

  describe("record tenant", () => {
    const docs = (bulk: BulkLogService) => (bulk.log as jest.Mock).mock.calls.map((call) => call[1])
    const traceContext = {
      getContextOrUndefined: () => ({ tenantId: 2, tenant: "tid2", userId: "u-1" }),
    } as AsyncContext

    it("takes the tenant from the record's own data, over the trace context", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(LibTestConfigV9, bulk, traceContext)

      logger.event("orders.service", "created", "order", "sales", undefined, undefined, { tenantId: 21 })
      logger.info("orders.service", "created", { tenantId: "21" })
      logger.debug("orders.service", "created", { tenantId: 21 })
      logger.warn("orders.service", "slow", { tenantId: "tid21" })
      logger.logError(new Error("failed"), { tenantId: 21 })
      logger.logException("Failed", "failed", { tenantId: 21 })

      expect(docs(bulk)).toHaveLength(6)
      for (const doc of docs(bulk)) {
        expect(doc.labels).toEqual(expect.objectContaining({ tenant: "tid21", userId: "u-1" }))
      }
    })

    it("applies to that record only", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(LibTestConfigV9, bulk)

      logger.info("orders.service", "first", { tenantId: 21 })
      logger.info("orders.service", "second")

      expect(docs(bulk)[0].labels).toEqual(expect.objectContaining({ tenant: "tid21" }))
      expect(docs(bulk)[1].labels).not.toHaveProperty("tenant")
    })

    it("keeps the trace context's tenant when the record names none or an invalid one", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(LibTestConfigV9, bulk, traceContext)

      logger.info("orders.service", "created", { tenantId: "abc" })
      logger.event("orders.service", "created", "order", "sales", undefined, undefined, { orderNumber: "B1" })

      for (const doc of docs(bulk)) {
        expect(doc.labels).toEqual(expect.objectContaining({ tenant: "tid2" }))
      }
    })
  })

  it("routes error through logError with APM, context, and a caller filename", () => {
    const bulk = { log: jest.fn(), upsert: jest.fn() } as unknown as BulkLogService
    const captureError = jest.spyOn(ApmHelper.Instance, "captureError").mockImplementation()
    const logger = new ElkV9LoggerService(LibTestConfigV9, bulk, {
      getContextOrUndefined: () => ({ traceId: "trace-error" }),
    } as AsyncContext)
    const consoleLog = jest.spyOn(winston.transports.Console.prototype, "log").mockImplementation()

    logger.error(new Error("failed"), "orders")

    expect(captureError).toHaveBeenCalledTimes(1)
    expect(bulk.log).toHaveBeenCalledWith(
      expect.stringMatching(/^logs-.*-error$/),
      expect.objectContaining({
        filename: expect.any(String),
        message: expect.stringContaining("context: 'orders'"),
        labels: expect.objectContaining({ traceId: "trace-error" }),
      })
    )
    consoleLog.mockRestore()
    captureError.mockRestore()
  })

  it("truncates errors only when a V9 limit is configured", () => {
    const bulk = { log: jest.fn() } as unknown as BulkLogService
    const logger = new ElkV9LoggerService({ ...LibTestConfigV9, errorTruncationLimit: 80 }, bulk)
    const captureError = jest.spyOn(ApmHelper.Instance, "captureError").mockImplementation()

    logger.logError(new Error("x".repeat(200)))

    expect((bulk.log as jest.Mock).mock.calls[0][1].message).toContain("...(truncated due to configured limit)")
    captureError.mockRestore()
  })

  describe("httpPayload", () => {
    const call = {
      direction: "outbound" as const,
      method: "GET",
      domain: "api.sprinting.io",
      path: "/api/v2/orders/1",
    }

    afterEach(() => {
      jest.spyOn(Math, "random").mockRestore()
    })

    it("does nothing when httpPayloadLogging isn't configured at all", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(LibTestConfigV9, bulk)

      logger.httpPayload(call)

      expect(bulk.log).not.toHaveBeenCalled()
    })

    it("does nothing when no rule matches and the default sampling rate excludes this call", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        { ...LibTestConfigV9, httpPayloadLogging: { defaultSamplingRate: 0.5, rules: [] } },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0.9)

      logger.httpPayload(call)

      expect(bulk.log).not.toHaveBeenCalled()
    })

    it("falls back to the default sampling rate when no rule matches", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        { ...LibTestConfigV9, httpPayloadLogging: { defaultSamplingRate: 1, rules: [] } },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload(call)

      expect(bulk.log).toHaveBeenCalled()
    })

    it("a matching rule's sampling rate overrides the default, even when the default would exclude it", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload(call)

      expect(bulk.log).toHaveBeenCalled()
    })

    it("sends to a dedicated httpPayload index and redacts sensitive fields when sampled", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, statusCode: 200, payload: { password: "secret", orderId: "o-1" } })

      expect(bulk.log).toHaveBeenCalledWith(
        expect.stringMatching(/^logs-.*-httppayload/),
        expect.objectContaining({
          direction: "outbound",
          httpMethod: "GET",
          httpDomain: "api.sprinting.io",
          httpPath: "/api/v2/orders/1",
          httpRoute: "/api/v2/orders/1",
          statusCode: 200,
          success: true,
          logType: "httpPayload",
          httpLogType: "OutboundHttpCall",
          payload: expect.objectContaining({ password: "REDACTED", orderId: "o-1" }),
        })
      )
    })

    it("writes env as the env of the httpPayload document", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          env: "p-bm20",
          httpPayloadLogging: { defaultSamplingRate: 1, rules: [] },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, statusCode: 200 })

      expect(bulk.log).toHaveBeenCalledWith(
        `logs-p-bm20-${LibTestConfig.serviceName}-httppayload`.toLowerCase(),
        expect.objectContaining({ env: "p-bm20", service: expect.objectContaining({ environment: "p-bm20" }) })
      )
    })

    it("uses an explicit route when provided instead of defaulting to path", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, path: "/api/v2/orders/123", route: "/api/v2/orders/{id}" })

      expect(bulk.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ httpPath: "/api/v2/orders/123", httpRoute: "/api/v2/orders/{id}" })
      )
    })

    it("derives success from statusCode when not explicitly provided", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, statusCode: 500 })

      expect(bulk.log).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ success: false }))
    })

    it("logs responseTime and error when provided", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, responseTime: 198, error: { message: "connection reset" } })

      expect(bulk.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ responseTime: 198, error: expect.objectContaining({ message: "connection reset" }) })
      )
    })

    it("passes authorization through untouched, trusting the caller to have already masked it", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      // Simulates a caller (e.g. Club) that already hashed the token before calling httpPayload().
      logger.httpPayload({
        ...call,
        headers: { Authorization: "Bearer md5:9f8e7d6c5b4a", "x-request-id": "req-1" },
      })

      const doc = (bulk.log as jest.Mock).mock.calls[0][1]
      expect(doc.headers.Authorization).toBe("Bearer md5:9f8e7d6c5b4a")
      expect(doc.headers["x-request-id"]).toBe("req-1")
    })

    it("drops noise headers (transport/boilerplate) from headers and responseHeaders", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({
        ...call,
        headers: { Host: "api.sprinting.io", "Content-Type": "application/json", "x-request-id": "req-1" },
        responseHeaders: { "Content-Length": "123", Vary: "Accept-Encoding", "x-request-id": "req-1" },
      })

      const doc = (bulk.log as jest.Mock).mock.calls[0][1]
      expect(doc.headers).toEqual({ "x-request-id": "req-1" })
      expect(doc.responseHeaders).toEqual({ "x-request-id": "req-1" })
    })

    it("still redacts header values that match the default sensitive-word list", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, headers: { "x-api-key": "raw-secret-value", "x-request-id": "req-1" } })

      const doc = (bulk.log as jest.Mock).mock.calls[0][1]
      expect(doc.headers["x-api-key"]).toBe("REDACTED")
      expect(doc.headers["x-request-id"]).toBe("req-1")
    })

    it("sets httpLogType to InboundHttpCall for inbound calls", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "inbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, direction: "inbound" })

      expect(bulk.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ logType: "httpPayload", httpLogType: "InboundHttpCall" })
      )
    })

    it("can skip console output without skipping ELK delivery", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          enableConsoleLogs: true,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "inbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      const consoleLog = jest.spyOn(winston.transports.Console.prototype, "log").mockImplementation()
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, direction: "inbound", logToConsole: false })

      expect(consoleLog).not.toHaveBeenCalled()
      expect(bulk.log).toHaveBeenCalledTimes(1)
      consoleLog.mockRestore()
    })

    it("logs to console by default", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          enableConsoleLogs: true,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "inbound", domain: "*", path: "*", samplingRate: 1 }],
          },
        },
        bulk
      )
      const consoleLog = jest.spyOn(winston.transports.Console.prototype, "log").mockImplementation()
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, direction: "inbound" })

      expect(consoleLog).toHaveBeenCalledTimes(1)
      consoleLog.mockRestore()
    })

    it("omits payload when the matching rule sets logRequest: false", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1, logRequest: false }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, payload: { a: 1 }, responsePayload: { b: 2 } })

      const doc = (bulk.log as jest.Mock).mock.calls[0][1]
      expect(doc).not.toHaveProperty("payload")
      expect(doc.responsePayload).toEqual({ b: 2 })
    })

    it("omits responsePayload when the matching rule sets logResponse: false", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: {
            defaultSamplingRate: 0,
            rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1, logResponse: false }],
          },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, payload: { a: 1 }, responsePayload: { b: 2 } })

      const doc = (bulk.log as jest.Mock).mock.calls[0][1]
      expect(doc.payload).toEqual({ a: 1 })
      expect(doc).not.toHaveProperty("responsePayload")
    })
  })
})
