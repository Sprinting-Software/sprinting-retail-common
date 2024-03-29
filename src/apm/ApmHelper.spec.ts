import { ApmHelper } from "./ApmHelper"
import { TestConfigRaw } from "../config/spec/TestConfig"

describe("ApmHelper", () => {
  beforeEach(() => {
    ApmHelper["config"] = undefined
    ApmHelper["apm"] = undefined
  })

  describe("getConfig", () => {
    it("should return default config if environment variables are undefined", () => {
      process.env = {}
      ApmHelper.init()
      const result = ApmHelper.Instance.getConfig()
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
      expect(ApmHelper.Instance.isInitialized()).toEqual(false)
    })

    it("does not initialize APM if enableLogs is empty string", () => {
      process.env.ENABLE_LOGS = ""
      ApmHelper.init()
      expect(ApmHelper.Instance.isInitialized()).toEqual(false)
    })

    it("does not initialize APM if enableLogs is undefined", () => {
      ApmHelper.init()
      expect(ApmHelper.Instance.isInitialized()).toEqual(false)
    })

    it("does not initialize APM if enableLogs is true", () => {
      process.env.ENABLE_LOGS = "true"
      ApmHelper.init()
      expect(ApmHelper.Instance.isInitialized()).toEqual(true)
    })

    it("does not reinitialize APM if it has already been initialized", () => {
      process.env.ENABLE_LOGS = "true"
      const startMock = jest.fn()
      jest.doMock("elastic-apm-node", () => ({ start: startMock }))
      const config = TestConfigRaw.elk.apm
      config.enableLogs = true
      ApmHelper.init(config)
      ApmHelper.init(config)
      expect(ApmHelper.Instance.isInitialized()).toEqual(true)
    })
  })
})
