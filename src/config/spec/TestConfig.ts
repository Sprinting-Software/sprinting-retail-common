import { RetailCommonConfigProvider } from "../RetailCommonConfigProvider"
import { PrincipalEnum } from "../../baseData/PrincipalEnum"

const SYSTEM_NAME = PrincipalEnum.TestSystemName
export const TestConfigRaw = {
  systemName: SYSTEM_NAME,
  envPrefix: "",
  isProduction: false,
  enableConsoleLogs: false,
  elk: {
    apm: {
      serviceName: SYSTEM_NAME,
      serverUrl: "http://localhost:9999",
      centralConfig: false,
      captureExceptions: false,
      enableLogs: false,
      labels: { someLabel: "someKey" },
      metricsInterval: "30s",
    },
    logstash: { host: "", isEnabled: false, port: 0 },
  },
}
export const TestConfig: RetailCommonConfigProvider = new RetailCommonConfigProvider(TestConfigRaw)
