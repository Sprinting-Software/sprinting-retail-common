import { ConfigOptions, LoggerService, LogLevel } from "./LoggerService"
import { HttpException } from "./HttpException"
import { ApmHelper } from "../apm/ApmHelper"

describe("LoggerService", () => {
  let loggerService: LoggerService

  const mockConfig: ConfigOptions = {
    env: "test",
    serviceName: "my-service",
    enableLogs: true,
    logstash: {
      isUDPEnabled: false,
      host: "",
      port: 0,
    },
  }

  beforeEach(() => {
    loggerService = new LoggerService(mockConfig)
  })

  describe("info", () => {
    it("should log an info message", () => {
      const spy = jest.spyOn(loggerService["logger"], "info")

      loggerService.info("filename.js", "This is an info message")

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "This is an info message",
          logType: LogLevel.info,
          filename: "filename.js",
          system: "my-service",
          component: "my-service",
          env: "test",
          systemEnv: "test-my-service",
        })
      )
    })
  })

  describe("debug", () => {
    it("should log a debug message", () => {
      const spy = jest.spyOn(loggerService["logger"], "debug")

      loggerService.debug("filename.js", "This is a debug message", { foo: "bar" })

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "This is a debug message",
          foo: "bar",
          filename: "filename.js",
          system: "my-service",
          component: "my-service",
          env: "test",
          systemEnv: "test-my-service",
        })
      )
    })
  })

  describe("warn", () => {
    it("should log a warning message", () => {
      const spy = jest.spyOn(loggerService["logger"], "warn")

      loggerService.warn("filename.js", "This is a warning message")

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "This is a warning message",
          filename: "filename.js",
          system: "my-service",
          component: "my-service",
          env: "test",
          systemEnv: "test-my-service",
          logType: LogLevel.warn,
        })
      )
    })
  })

  describe("logError", () => {
    it("should log HttpException with data and detailedMessage", () => {
      const innerError = new HttpException(404, "Not found")
      const data = { userId: 123 }
      const detailedMessage = "Error occurred while fetching user data"
      const captureErrorSpy = jest.spyOn(ApmHelper, "captureError")
      const logErrorSpy = jest.spyOn(loggerService["logger"], "error")

      loggerService.logError(innerError, data, detailedMessage)

      expect(captureErrorSpy).toHaveBeenCalledWith(innerError)
      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.any(String),
          timestamp: expect.any(String),
          system: "my-service",
          component: "my-service",
          env: "test",
          systemEnv: "test-my-service",
          logType: LogLevel.error,
          message: "Not found",
        })
      )
    })

    it("should log HttpException with default data and detailedMessage", () => {
      const innerError = new HttpException(404, "Not found")
      const captureErrorSpy = jest.spyOn(ApmHelper, "captureError")
      const logErrorSpy = jest.spyOn(loggerService["logger"], "error")

      loggerService.logError(innerError)

      expect(captureErrorSpy).toHaveBeenCalledWith(innerError)
      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.any(String),
          timestamp: expect.any(String),
          system: "my-service",
          component: "my-service",
          env: "test",
          systemEnv: "test-my-service",
          logType: LogLevel.error,
          message: "Not found",
        })
      )
    })

    it("should log named error with data and detailedMessage", () => {
      const name = "UserNotFound"
      const data = { userId: 123 }
      const detailedMessage = "Error occurred while fetching user data"
      const logErrorSpy = jest.spyOn(loggerService["logger"], "error")

      loggerService.logError(name, data, detailedMessage)

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.any(String),
          timestamp: expect.any(String),
          system: "my-service",
          component: "my-service",
          env: "test",
          systemEnv: "test-my-service",
          logType: LogLevel.error,
          message: name,
          ...data,
        })
      )
    })

    it("should log named error with default data and detailedMessage", () => {
      const name = "UserNotFound"
      const logErrorSpy = jest.spyOn(loggerService["logger"], "error")

      loggerService.logError(name)

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.any(String),
          timestamp: expect.any(String),
          system: "my-service",
          component: "my-service",
          env: "test",
          systemEnv: "test-my-service",
          logType: LogLevel.error,
          message: name,
        })
      )
    })
  })
})
