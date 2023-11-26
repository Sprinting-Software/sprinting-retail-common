import { Test } from "@nestjs/testing"

import { LoggerService } from "../../logger/LoggerService"
import { ApmHelper } from "../../apm/ApmHelper"
import { TestConfigRaw } from "../../config/spec/TestConfig"
import { CommonAppModule } from "../CommonAppModule"

describe("CommonAppModule", () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeAll(async () => {})

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should provide an instance of ApmHelper", async () => {
    const app = await Test.createTestingModule({
      imports: [CommonAppModule.forRoot(TestConfigRaw)],
    }).compile()
    const loggerService = app.get<LoggerService>(LoggerService)
    expect(loggerService).toBeInstanceOf(LoggerService)
    const apmHelper = app.get<ApmHelper>(ApmHelper)
    expect(apmHelper).toBeInstanceOf(ApmHelper)
  })

  it("should subscribe an unhandledRejection handler", async () => {
    const warnMock = jest.spyOn(LoggerService.prototype, "warn")
    const countPre = process.listenerCount("unhandledRejection")
    await Test.createTestingModule({
      imports: [CommonAppModule.forRoot(TestConfigRaw)],
    }).compile()
    const countPost1 = process.listenerCount("unhandledRejection")
    await Test.createTestingModule({
      imports: [CommonAppModule.forRoot(TestConfigRaw)],
    }).compile()
    const countPost2 = process.listenerCount("unhandledRejection")

    // sometimes the test runner process already has a handler, in that case we are not adding it,
    // hence the strange .toBeCalledTimes and .toBe clauses
    expect(warnMock).toBeCalledTimes(countPre > 0 ? 2 : 1)
    expect(warnMock).toBeCalledWith(
      "CommonAppModule",
      "There is already an 'unhandledRejection' handler, not adding sprinting-retail-common one."
    )

    expect(countPost1).toBe(countPre === 0 ? countPre + 1 : countPre)
    expect(countPost2).toBe(countPost1)
  })
})
