import { ApmConfig, ApmHelper } from "./ApmHelper"
import { AppException } from "../errorHandling/AppException"
import { LogContext } from "../common/LogContext"

describe("ApmHelper", () => {
  const mockConfig: ApmConfig = {
    enableLogs: true,
    serverUrl: "http://localhost:8200",
    secretToken: "test-secret-token",
    serviceName: "test-service",
    apmSamplingRate: 1.0,
  }

  beforeEach(() => {
    ApmHelper["config"] = undefined
    ApmHelper["apm"] = undefined
  })

  describe("constructor", () => {
    it("should set config and call init method", () => {
      new ApmHelper(mockConfig)
      expect(ApmHelper["config"]).toEqual(mockConfig)
      expect(ApmHelper["apm"]).not.toBeUndefined()
    })

    it("should not call init method if config is undefined", () => {
      new ApmHelper()
      expect(ApmHelper["config"]).toBeUndefined()
      expect(ApmHelper["apm"]).toBeUndefined()
    })
  })

  describe("getConfig", () => {
    it("should return config from class property if it exists", () => {
      ApmHelper["config"] = mockConfig
      const result = ApmHelper.getConfig()

      expect(result).toEqual(mockConfig)
    })

    it("should return config from environment variables if class property is undefined", () => {
      process.env.ENABLE_LOGS = "true"
      process.env.ELK_SERVICE_URL = "http://localhost:8200"
      process.env.ELK_SERVICE_SECRET = "test-secret-token"
      process.env.ELK_SERVICE_NAME = "test-service"
      process.env.ELK_APM_SAMPLINGRATE = "1.0"

      const result = ApmHelper.getConfig()

      expect(result).toEqual(mockConfig)
    })

    it("should return default config if environment variables are undefined", () => {
      process.env = {}
      const result = ApmHelper.getConfig()

      expect(result.enableLogs).toBe(false)
      expect(result.serverUrl).toBeUndefined()
      expect(result.secretToken).toBeUndefined()
      expect(result.serviceName).toBeUndefined()
      expect(result.apmSamplingRate).toBeNaN()
    })
  })

  describe("init", () => {
    beforeEach(() => {
      jest.resetModules()
      process.env.NODE_ENV = "production"
    })

    it("does not initialize APM if enableLogs is false", () => {
      process.env.ENABLE_LOGS = "false"
      ApmHelper.init()
      expect(ApmHelper.getAPMClient()).toBeUndefined()
    })

    it("does not reinitialize APM if it has already been initialized", () => {
      process.env.ENABLE_LOGS = "true"
      const startMock = jest.fn()
      jest.doMock("elastic-apm-node", () => ({ start: startMock }))
      ApmHelper.init()
      ApmHelper.init()
      expect(startMock).toHaveBeenCalledTimes(1)
    })

    it("initializes APM with the correct config", () => {
      process.env.ENABLE_LOGS = "true"
      process.env.ELK_SERVICE_URL = "http://example.com"
      process.env.ELK_SERVICE_SECRET = "secret"
      process.env.ELK_SERVICE_NAME = "test-service"
      process.env.ELK_APM_SAMPLINGRATE = "0.5"
      const startMock = jest.fn()
      jest.doMock("elastic-apm-node", () => ({ start: startMock }))
      ApmHelper.init()
      expect(startMock).toHaveBeenCalledWith({
        serviceName: "test-service",
        centralConfig: false,
        captureExceptions: false,
        metricsInterval: 0,
        transactionSampleRate: 0.5,
        serverUrl: "http://example.com",
        secretToken: "secret",
      })
    })
  })

  describe("captureError", () => {
    const mockException = new AppException(500, "Test error", "Something went wrong")
    const mockLogContext: LogContext = { userId: "123", tenantId: 1 }

    beforeEach(() => {
      ApmHelper["apm"] = {
        captureError: jest.fn(),
      } as any
      ApmHelper["config"] = {
        labels: { environment: "test" },
      } as any
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it("should not capture error if apm is not initialized", () => {
      const spy = jest.spyOn(ApmHelper["apm"], "captureError")
      ApmHelper["apm"] = null
      ApmHelper.captureError(mockException)

      expect(spy).not.toHaveBeenCalled()
    })

    it("should capture error with default error labels and details", () => {
      const spy = jest.spyOn(ApmHelper["apm"], "captureError")
      ApmHelper.captureError(mockException)
      expect(spy).toHaveBeenCalledWith(mockException, {
        handled: false,
        labels: {
          errorName: "Test error",
          errorDescription: "Something went wrong",
          environment: "test",
        },
        captureAttributes: false,
        message: mockException.toString(),
        custom: undefined,
      })
    })

    it("should capture error with error labels from config and context", () => {
      ApmHelper.captureError(mockException, mockLogContext)
      expect(ApmHelper["apm"]?.captureError).toHaveBeenCalledWith(mockException, {
        handled: false,
        labels: {
          errorName: "Test error",
          errorDescription: "Something went wrong",
          environment: "test",
          tenantId: "tid1",
          userId: "123",
        },
        captureAttributes: false,
        message: mockException.toString(),
        custom: mockException.contextData,
      })
    })

    it("should capture error with custom error details for AppException", () => {
      const mockAppException = new AppException(500, "Test error", "Something went wrong", { customProp: true })
      ApmHelper.captureError(mockAppException)
      expect(ApmHelper["apm"]?.captureError).toHaveBeenCalledWith(mockAppException, {
        handled: false,
        labels: {
          errorName: "Test error",
          errorDescription: "Something went wrong",
          environment: "test",
        },
        captureAttributes: false,
        message: mockAppException.toString(),
        custom: { customProp: true },
      })
    })

    it("should capture error with handled flag", () => {
      ApmHelper.captureError(mockException, undefined, true)
      expect(ApmHelper["apm"]?.captureError).toHaveBeenCalledWith(mockException, {
        handled: true,
        labels: {
          errorName: "Test error",
          errorDescription: "Something went wrong",
          environment: "test",
        },
        captureAttributes: false,
        message: mockException.toString(),
        custom: mockException.contextData,
      })
    })
  })
})
