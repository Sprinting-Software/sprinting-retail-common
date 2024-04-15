import { Test } from "@nestjs/testing"
import { ConfigModule } from "../ConfigModule"
import { TestConfig } from "./TestConfig"
import { RetailCommonConfigProvider } from "../RetailCommonConfigProvider"
import { PrincipalEnum } from "../../baseData/PrincipalEnum"

describe("ConfigModule", () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeAll(async () => {})

  describe("CommonConfigService", () => {
    it("should provide an instance of CommonConfigService", async () => {
      const app = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(TestConfig)],
      }).compile()
      const provider = app.get<RetailCommonConfigProvider>(RetailCommonConfigProvider)
      const myconfig = provider.config
      expect(myconfig).toBeDefined()
      expect(myconfig).toEqual({
        elk: {
          apm: {
            captureExceptions: false,
            centralConfig: false,
            enableLogs: false,
            labels: {
              someLabel: "someKey",
            },
            metricsInterval: "30s",
            serverUrl: "http://localhost:9999",
            serviceName: PrincipalEnum.TestSystemName,
          },
          logstash: {
            host: "",
            isEnabled: false,
            port: 0,
          },
        },
        envPrefix: "",
        isProduction: false,
        enableConsoleLogs: false,
        enableConsoleLogsSimplified: false,
        systemName: PrincipalEnum.TestSystemName,
      })
      expect(myconfig.elk.apm.serviceName).toEqual(PrincipalEnum.TestSystemName)
    })
  })
})
