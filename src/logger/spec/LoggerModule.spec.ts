import { Test } from "@nestjs/testing"
import { ConfigModule } from "../../config/ConfigModule"

import { LoggerModule } from "../LoggerModule"
import { LoggerService } from "../LoggerService"
import { ApmHelper } from "../../apm/ApmHelper"
import { LibTestConfig, TestConfig } from "../../config/spec/TestConfig"
import { LoggerServiceV2 } from "../LoggerServiceV2"

describe("LoggerModule", () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeAll(async () => {})

  describe("LoggerModule", () => {
    it("should provide an instance of LoggerService and ApmHelper", async () => {
      const app = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(TestConfig), LoggerModule.forRoot(TestConfig)],
      }).compile()
      const loggerService = app.get<LoggerService>(LoggerService)
      expect(loggerService).toBeDefined()
      expect(loggerService).toBeInstanceOf(LoggerService)
      loggerService.info(__filename, "some info message")

      const apmHelper = app.get<ApmHelper>(ApmHelper)
      expect(apmHelper).toBeDefined()
      expect(apmHelper).toBeInstanceOf(ApmHelper)
    })

    it("forRootV2 should work", async () => {
      const app = await Test.createTestingModule({
        imports: [LoggerModule.forRootV2(LibTestConfig)],
      }).compile()
      const loggerService = app.get<LoggerService>(LoggerService)
      expect(loggerService).toBeDefined()
      expect(loggerService).toBeInstanceOf(LoggerService)
      loggerService.info(__filename, "some info message")

      const apmHelper = app.get<ApmHelper>(ApmHelper)
      expect(apmHelper).toBeDefined()
      expect(apmHelper).toBeInstanceOf(ApmHelper)
    })

    it("loggerServiceV2 should work", async () => {
      const app = await Test.createTestingModule({
        imports: [LoggerModule.forRootV2(LibTestConfig)],
      }).compile()
      const loggerService = app.get<LoggerServiceV2>(LoggerServiceV2)
      expect(loggerService).toBeDefined()
      expect(loggerService).toBeInstanceOf(LoggerServiceV2)
      loggerService.info(__filename, "some info message")
    })
  })
})
