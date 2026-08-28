import { Test } from "@nestjs/testing"

import { LoggerService } from "../../logger/LoggerService"
import { LegacyLoggerService } from "../../logger/LegacyLoggerService"
import { ApmHelper } from "../../apm/ApmHelper"
import { LibTestConfig } from "../../config/spec/TestConfig"
import { CommonAppModule } from "../CommonAppModule"
import { AsyncContextModule } from "../../asyncLocalContext/AsyncContextModule"
import { ElkV9LoggerService } from "../../logger/ElkV9LoggerService"
import { ElkVersion } from "../../config/interface/LibConfig"

describe("CommonAppModule", () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeAll(async () => {})

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should provide an instance of ApmHelper", async () => {
    const app = await Test.createTestingModule({
      imports: [AsyncContextModule.forRoot(), CommonAppModule.forRoot(LibTestConfig)],
    }).compile()
    const loggerService = app.get<LoggerService>(LoggerService)
    expect(loggerService).toBeInstanceOf(LegacyLoggerService)
    const apmHelper = app.get<ApmHelper>(ApmHelper)
    expect(apmHelper).toBeInstanceOf(ApmHelper)
  })

  it("should subscribe an unhandledRejection handler", async () => {
    const warnMock = jest.spyOn(LegacyLoggerService.prototype, "warn")
    const countPre = process.listenerCount("unhandledRejection")
    await Test.createTestingModule({
      imports: [AsyncContextModule.forRoot(), CommonAppModule.forRoot(LibTestConfig)],
    }).compile()
    const countPost1 = process.listenerCount("unhandledRejection")
    await Test.createTestingModule({
      imports: [AsyncContextModule.forRoot(), CommonAppModule.forRoot(LibTestConfig)],
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

  it("registers the ELK v9 logger only for v9 configuration", async () => {
    const v7App = await Test.createTestingModule({
      imports: [AsyncContextModule.forRoot(), CommonAppModule.forRoot(LibTestConfig)],
    }).compile()
    expect(v7App.get(LoggerService)).toBeInstanceOf(LegacyLoggerService)
    await v7App.close()

    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ errors: false }) } as Response)
    const v9App = await Test.createTestingModule({
      imports: [
        AsyncContextModule.forRoot(),
        CommonAppModule.forRoot({
          ...LibTestConfig,
          elkVersion: ElkVersion.V9,
          elkRestApi: {
            endpoint: "http://localhost:9200",
            apiKey: "test-key",
            dataStream: "logs-test-default",
          },
        }),
      ],
    }).compile()
    expect(v9App.get(LoggerService)).toBeInstanceOf(ElkV9LoggerService)
    await v9App.close()
    fetchMock.mockRestore()
  })
})
