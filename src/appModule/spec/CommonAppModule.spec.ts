import { Test } from "@nestjs/testing"

import { LoggerService } from "../../logger/LoggerService"
import { ApmHelper } from "../../apm/ApmHelper"
import { TestConfigRaw } from "../../config/spec/TestConfig"
import { CommonAppModule } from "../CommonAppModule"

describe("CommonAppModule", () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeAll(async () => {})

  it("should provide an instance of CommonAppModule", async () => {
    const app = await Test.createTestingModule({
      imports: [CommonAppModule.forRoot(TestConfigRaw)],
    }).compile()
    const loggerService = app.get<LoggerService>(LoggerService)
    expect(loggerService).toBeInstanceOf(LoggerService)
    const apmHelper = app.get<ApmHelper>(ApmHelper)
    expect(apmHelper).toBeInstanceOf(ApmHelper)
  })
})
