import { ICommonLogContext, LoggerService } from "../LoggerService"
import { ClientException } from "../../errorHandling/exceptions/ClientException"

/**
 * To run this test, you have to edit the environment variables LOGSTASH_PORT and LOGSTASH_HOST in the file .run/Run all cross tests.run.xml
 */
describe("logger", () => {
  let loggerService: LoggerService

  const logstashConfig = {
    env: "test",
    serviceName: "sprintingretailcommon",
    enableLogs: true,
    enableConsoleLogs: true,
    logstash: {
      isUDPEnabled: true,
      host: process.env.LOGSTASH_HOST as string,
      port: parseInt(process.env.LOGSTASH_PORT as string),
    },
  }

  beforeEach(() => {
    if (logstashConfig.logstash.host === "xxx" || logstashConfig.logstash.port === 0) {
      throw new Error(
        "Please set the environment variables LOGSTASH_PORT and LOGSTASH_HOST in the file .run/Run all cross tests.run.xml. Please don't check in this change."
      )
    }
    loggerService = new LoggerService(logstashConfig)
  })

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  it("should log at all levels", () => {
    const sharedContext: ICommonLogContext = { client: { name: "Bifrost" }, tenantId: 100 }
    loggerService.info(__filename, "Testing", {}, sharedContext)
    loggerService.warn(__filename, "Testing", {}, sharedContext)
    loggerService.debug(__filename, "Testing", {}, sharedContext)
    loggerService.logError(
      new ClientException("LoggerServiceCrossTestError", "Test description", { tenant: "tid100", tenantId: 100 })
    )
  })

  it("should log at all levels with context data", () => {
    loggerService.info(__filename, "Testing", { tenant: "tid100", tenantId: 100 })
    loggerService.warn(__filename, "Testing", { tenant: "tid100", tenantId: 100 })
    loggerService.debug(__filename, "Testing", { tenant: "tid100", tenantId: 100 })
    loggerService.logError(
      new ClientException("LoggerServiceCrossTestError", "Test description", { tenant: "tid100", tenantId: 100 })
    )
  })

  it("should log events", () => {
    loggerService.event(__filename, "TestEvent", "TestCategory", "TestDomain", { someKey: "someValue" })
  })
})
