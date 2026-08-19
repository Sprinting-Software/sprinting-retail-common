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
      expect.stringMatching(/^(?!logs-apm-).*-log-\d{4}\.\d{2}$/),
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
      expect.stringMatching(/^(?!logs-apm-).*-error-\d{4}\.\d{2}$/),
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
        expect.stringMatching(/^(?!logs-apm-).*-httppayload-\d{4}\.\d{2}$/),
        expect.objectContaining({
          direction: "outbound",
          method: "GET",
          domain: "api.sprinting.io",
          path: "/api/v2/orders/1",
          route: "/api/v2/orders/1",
          statusCode: 200,
          success: true,
          logType: "httpPayload",
          httpLogType: "OutboundHttpCall",
          payload: expect.objectContaining({ password: "REDACTED", orderId: "o-1" }),
        })
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
        expect.objectContaining({ path: "/api/v2/orders/123", route: "/api/v2/orders/{id}" })
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
