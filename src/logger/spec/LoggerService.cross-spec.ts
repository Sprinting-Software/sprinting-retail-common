import { LoggerService } from "../LoggerService"
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
    logstash: {
      isUDPEnabled: true,
      host: process.env.LOGSTASH_HOST,
      port: parseInt(process.env.LOGSTASH_PORT),
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
    loggerService.info(__filename, "Testing")
    loggerService.warn(__filename, "Testing")
    loggerService.debug(__filename, "Testing")
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
    loggerService.event(__filename, "TestEvent", { tenant: "tid100", tenantId: 100 }, "TestCategory")
  })
})
