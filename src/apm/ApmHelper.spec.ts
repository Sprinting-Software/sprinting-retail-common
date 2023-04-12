import { ApmHelper } from "./ApmHelper"
import { AppException } from "../errorHandling/exceptions/AppException"
import { TestConfigRaw } from "../config/spec/TestConfig"

describe("ApmHelper", () => {
  const mockConfig: any = {
    captureErrorLogStackTraces: true,
    captureExceptions: false,
    centralConfig: false,
    enableLogs: true,
    metricsInterval: 0,
    secretToken: "test-secret-token",
    serverUrl: "http://localhost:8200",
    serviceName: "test-service",
    transactionSampleRate: 1,
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
      expect(ApmHelper["config"]).toEqual({
        captureErrorLogStackTraces: true,
        captureExceptions: false,
        enableLogs: false,
        centralConfig: false,
        metricsInterval: 0,
        transactionSampleRate: 1,
      })
      expect(ApmHelper["apm"]).toBeUndefined()
    })
  })

  describe("getConfig", () => {
    it("should return default config if environment variables are undefined", () => {
      process.env = {}
      new ApmHelper()
      const result = ApmHelper.getConfig()
      expect(result.enableLogs).toBe(false)
      expect(result.serverUrl).toBeUndefined()
      expect(result.secretToken).toBeUndefined()
      expect(result.serviceName).toBeUndefined()
      expect(result.transactionSampleRate).toEqual(1)
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
      const config = TestConfigRaw.elk.apm
      config.enableLogs = true
      new ApmHelper(config)
      ApmHelper.init()
      ApmHelper.init()
      expect(startMock).toHaveBeenCalledTimes(1)
    })

    describe("captureError", () => {
      const mockException = new AppException(500, "Test error", "Something went wrong")
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
    })
  })
})
