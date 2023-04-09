import { Test } from "@nestjs/testing"
import { ConfigModule } from "../../config/ConfigModule"
import config from "config"
import { LoggerModule } from "../../logger/LoggerModule";
import { LoggerService } from "../../logger/LoggerService";
import { ApmHelper } from "../../apm/ApmHelper";

const myconfig = config
describe("LoggerModule", () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeAll(async () => {})

  describe("LoggerModule", () => {
    it("should provide an instance of LoggerService and ApmHelper", async () => {
      const app = await Test.createTestingModule({
        imports: [ConfigModule.register(myconfig), LoggerModule],
      }).compile()
      const loggerService = app.get<LoggerService>(LoggerService)
      expect(loggerService).toBeDefined()
      expect(loggerService).toBeInstanceOf(LoggerService)

      const apmHelper = app.get<ApmHelper>(ApmHelper)
      expect(apmHelper).toBeDefined()
      expect(apmHelper).toBeInstanceOf(ApmHelper)
    })
  })
})
