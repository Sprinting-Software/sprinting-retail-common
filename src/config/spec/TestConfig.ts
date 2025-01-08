import { PrincipalName } from "../../baseData/PrincipalName"
import { RetailCommonConfigProvider } from "../RetailCommonConfigProvider"
import { LibConfig } from "../interface/LibConfig"
import { ConfigMapper } from "../legacyInterfaces/ConfigMapper"

const SYSTEM_NAME: PrincipalName = "TestSystemName"
export const TestConfigRaw = {
  systemName: SYSTEM_NAME,
  envPrefix: "",
  isProduction: false,
  enableConsoleLogs: false,
  enableConsoleLogsSimplified: false,
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
export const LibTestConfig: LibConfig = ConfigMapper.mapToLoggerConfig(TestConfigRaw)
export const PrincipalEnum = {
  TestSystemName: "TestSystemName",
}
