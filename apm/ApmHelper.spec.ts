import { ApmConfig, ApmHelper } from "./ApmHelper"

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
    beforeEach(() => {
      jest.spyOn(console, "log").mockImplementation(() => {
        // Do nothing
      })
      jest.resetModules()
      ApmHelper["apm"] = undefined
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it("should not capture error if APM is not initialized", () => {
      const exception = new Error("test error")

      ApmHelper.captureError(exception)

      // eslint-disable-next-line no-console
      expect(console.log).not.toHaveBeenCalled()
    })

    it("should capture error with correct parameters if APM is initialized", () => {
      const exception = new Error("test error")
      const apmMock = {
        captureError: jest.fn(),
      }
      ApmHelper["apm"] = apmMock

      // Act
      ApmHelper.captureError(exception, "testTenantId")

      expect(apmMock.captureError).toHaveBeenCalledWith(exception, {
        handled: false,
        labels: { errorName: "Error", tenantId: "testTenantId" },
        message: "test error",
        custom: {
          errorName: "Error",
          errorString: "Error: test error",
        },
      })
    })
  })
})
