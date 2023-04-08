import { Test, TestingModule } from "@nestjs/testing"
import { ConfigModule } from "../ConfigModule"
import { CommonConfigService } from "../../config/CommonConfigService"
import { CommonConfigSingleton } from "../../config/CommonConfigSingleton"
import config from "config"

const myconfig = config
describe("ConfigModule", () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeAll(async () => {})

  describe("CommonConfigService", () => {
    it("should provide an instance of CommonConfigService", async () => {
      CommonConfigSingleton.Init(myconfig)
      const app = await Test.createTestingModule({
        imports: [ConfigModule],
      }).compile()
      const commonConfigService = app.get<CommonConfigService>(CommonConfigService)
      expect(commonConfigService).toBeDefined()
      expect(commonConfigService).toBeInstanceOf(CommonConfigService)
      CommonConfigSingleton.reset();
    })

    it("should use the config from CommonConfigSingleton", async () => {
      CommonConfigSingleton.Init(myconfig)
      const app = await Test.createTestingModule({
        imports: [ConfigModule],
      }).compile()
      const commonConfigService = app.get<CommonConfigService>(CommonConfigService)
      const config = CommonConfigSingleton.GetConfig()
      expect(commonConfigService.getRawConfig()).toEqual(config)
      CommonConfigSingleton.reset();
    })
  })
})
