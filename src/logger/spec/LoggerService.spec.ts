import { Exception } from "../../errorHandling/exceptions/Exception"
import { LogContext } from "../LogContext"
import { LoggerService, LogLevel } from "../LoggerService"

describe("logger", () => {
  let loggerService: LoggerService

  const mockConfig = {
    env: "test",
    serviceName: "test-service",
    enableLogs: true,
    enableConsoleLogs: true,
    logstash: {
      isUDPEnabled: false,
      host: "localhost",
      port: 9200,
    },
  }

  beforeEach(() => {
    loggerService = new LoggerService(mockConfig)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("info", () => {
    it("should log an info message", () => {
      const spy = jest.spyOn(LoggerService["logger"], "info")
      loggerService.info("test-file", "test-message")
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "test-file",
          system: mockConfig.serviceName,
          component: "test-service",
          systemEnv: "test-test-service",
          logType: LogLevel.info,
          message: "test-message",
        })
      )
    })
  })

  describe("debug", () => {
    it("should log a debug message", () => {
      const spy = jest.spyOn(LoggerService["logger"], "warn")
      loggerService.debug("test-file", "test-message")
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "test-file",
          system: mockConfig.serviceName,
          component: "test-service",
          env: mockConfig.env,
          systemEnv: "test-test-service",
          logType: LogLevel.warn,
          message: "test-message",
        })
      )
    })
  })

  describe("warn", () => {
    it("should log a warn message", () => {
      const spy = jest.spyOn(LoggerService["logger"], "warn")
      loggerService.warn("test-file", "test-message")
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "test-file",
          system: mockConfig.serviceName,
          component: "test-service",
          env: mockConfig.env,
          systemEnv: "test-test-service",
          logType: LogLevel.warn,
          message: "test-message",
        })
      )
    })
  })

  describe("logError", () => {
    it("should log an AppException with context data", () => {
      const appException = new Exception(404, "Test error", "Test error message")

      const contextData: LogContext = {
        userId: "123",
        tenantId: "abc123",
      }

      loggerService.logError(appException, contextData)
    })
  })
})
