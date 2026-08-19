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
      expect.stringMatching(/^logs-apm-.*-log-\d{4}\.\d{2}$/),
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
      expect.stringMatching(/^logs-apm-.*-error-\d{4}\.\d{2}$/),
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
    const call = { direction: "outbound" as const, verb: "GET", domain: "api.sprinting.io", path: "/api/v2/orders/1" }

    it("does nothing when no rule matches the call", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService({ ...LibTestConfigV9, httpPayloadLogging: { rules: [] } }, bulk)

      logger.httpPayload(call)

      expect(bulk.log).not.toHaveBeenCalled()
    })

    it("does nothing when the matching rule's sampling rate excludes this call", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: { rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 0.5 }] },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0.9)

      logger.httpPayload(call)

      expect(bulk.log).not.toHaveBeenCalled()
      jest.spyOn(Math, "random").mockRestore()
    })

    it("sends to a dedicated httpPayload index and redacts sensitive fields when sampled", () => {
      const bulk = { log: jest.fn() } as unknown as BulkLogService
      const logger = new ElkV9LoggerService(
        {
          ...LibTestConfigV9,
          httpPayloadLogging: { rules: [{ direction: "outbound", domain: "*", path: "*", samplingRate: 1 }] },
        },
        bulk
      )
      jest.spyOn(Math, "random").mockReturnValue(0)

      logger.httpPayload({ ...call, statusCode: 200, requestBody: { password: "secret", orderId: "o-1" } })

      expect(bulk.log).toHaveBeenCalledWith(
        expect.stringMatching(/^logs-apm-.*-httpPayload-\d{4}\.\d{2}$/),
        expect.objectContaining({
          direction: "outbound",
          verb: "GET",
          domain: "api.sprinting.io",
          path: "/api/v2/orders/1",
          statusCode: 200,
          requestBody: expect.objectContaining({ password: "REDACTED", orderId: "o-1" }),
        })
      )
      jest.spyOn(Math, "random").mockRestore()
    })
  })
})
