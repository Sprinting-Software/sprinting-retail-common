import { AppException } from "../../errorHandling/AppException"
import { LogContext } from "../LogContext"
import { LoggerService, LogLevel } from "../LoggerService"

describe("logger", () => {
  let loggerService: LoggerService

  const mockConfig = {
    env: "test",
    serviceName: "test-service",
    enableLogs: true,
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
      const spy = jest.spyOn(loggerService["logger"], "info")
      loggerService.info("test-file", "test-message")
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "test-file",
          system: mockConfig.serviceName,
          component: "test-service",
          env: mockConfig.env,
          systemEnv: "test-test-service",
          level: LogLevel.info,
          logType: LogLevel.info,
          message: "test-message",
        })
      )
    })
  })

  describe("debug", () => {
    it("should log a debug message", () => {
      const spy = jest.spyOn(loggerService["logger"], "warn")
      loggerService.debug("test-file", "test-message")
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "test-file",
          system: mockConfig.serviceName,
          component: "test-service",
          env: mockConfig.env,
          systemEnv: "test-test-service",
          level: LogLevel.warn,
          logType: LogLevel.warn,
          message: "test-message",
        })
      )
    })
  })

  describe("warn", () => {
    it("should log a warn message", () => {
      const spy = jest.spyOn(loggerService["logger"], "warn")
      loggerService.warn("test-file", "test-message")
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "test-file",
          system: mockConfig.serviceName,
          component: "test-service",
          env: mockConfig.env,
          systemEnv: "test-test-service",
          level: LogLevel.warn,
          logType: LogLevel.warn,
          message: "test-message",
        })
      )
    })
  })

  describe("logError", () => {
    it("should log an AppException with context data", () => {
      const appException = new AppException(404, "Test error", "Test error message")
      const spy = jest.spyOn(loggerService["logger"], "error")

      const contextData: LogContext = {
        userId: "123",
        tenantId: "abc123",
      }

      loggerService.logError(appException, contextData)

      // Ensure logger was called with the correct log message
      const expectedLogMessage = {
        filename: expect.any(String),
        system: mockConfig.serviceName,
        component: mockConfig.serviceName,
        env: mockConfig.env,
        systemEnv: `${mockConfig.env}-${mockConfig.serviceName}`,
        logType: LogLevel.error,
        message: expect.stringContaining(appException.toString()),
        userId: contextData.userId,
        tenantId: contextData.tenantId,
      }
      expect(spy).toHaveBeenCalledWith(expect.objectContaining(expectedLogMessage))
    })

    it("should log an AppError with additional data", () => {
      const appError = new AppException(400, "Test error")
      const spy = jest.spyOn(loggerService["logger"], "error")
      const data = { foo: "bar" }

      loggerService.logError(appError, data)

      // Ensure logger was called with the correct log message
      const expectedLogMessage = {
        filename: expect.any(String),
        system: mockConfig.serviceName,
        component: mockConfig.serviceName,
        env: mockConfig.env,
        systemEnv: `${mockConfig.env}-${mockConfig.serviceName}`,
        level: LogLevel.error,
        logType: LogLevel.error,
        message: expect.stringContaining(appError.toString()),
        foo: data.foo,
      }
      expect(spy).toHaveBeenCalledWith(expect.objectContaining(expectedLogMessage))
    })
  })
})
