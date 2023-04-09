import { Test, TestingModule } from "@nestjs/testing"
import { ConfigModule } from "../../config/ConfigModule"
import { CommonConfigService } from "../../config/CommonConfigService"
import config from "config"

const myconfig = config
describe("ConfigModule", () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeAll(async () => {})

  describe("CommonConfigService", () => {
    it("should provide an instance of CommonConfigService", async () => {
      const app = await Test.createTestingModule({
        imports: [ConfigModule.register(myconfig)],
      }).compile()
      const commonConfigService = app.get<CommonConfigService>(CommonConfigService)
      expect(commonConfigService).toBeDefined()
      expect(commonConfigService).toBeInstanceOf(CommonConfigService)
      expect(commonConfigService.elkConfig.serviceName).toEqual("sprinting-retail-common")
    })

    it("should use the config from CommonConfigSingleton", async () => {
      const app = await Test.createTestingModule({
        imports: [ConfigModule.register(myconfig)],
      }).compile()
      const commonConfigService = app.get<CommonConfigService>(CommonConfigService)
      expect(commonConfigService.getRawConfig()).toEqual({
        elk: {
          elkConfig: {
            apmTransactionSampleRate: 1,
            apmVersion: "1.0.1",
            flushInterval: 500,
            hostname: "http://10.0.0.0",
            port: 9999,
          },
          logstashConfig: {
            hostname: "10.0.0.0",
            port: 9999,
          },
          sendLogsToElk: false,
          serviceName: "sprinting-retail-common",
        },
      })
    })
  })
})
