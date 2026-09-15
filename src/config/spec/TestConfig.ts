import { PrincipalName } from "../../baseData/PrincipalName"
import { RetailCommonConfigProvider } from "../RetailCommonConfigProvider"
import { ElkV7Config, ElkV9Config, ElkVersion, LibConfig } from "../interface/LibConfig"
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
const TestConfigRawV9 = {
  ...TestConfigRaw,
  elk: {
    ...TestConfigRaw.elk,
    restApi: {
      useForEvents: false,
      useForErrors: false,
      endpoint: "http://localhost:9200",
      apiKey: "test-api-key",
      enableTcpSender: false,
    },
  },
}
export const TestConfig: RetailCommonConfigProvider = new RetailCommonConfigProvider(TestConfigRaw)
export const LibTestConfig: LibConfig & ElkV7Config = ConfigMapper.mapToLoggerConfig(TestConfigRaw)
export const LibTestConfigV9: LibConfig & ElkV9Config = ConfigMapper.mapToLoggerConfig(TestConfigRawV9, ElkVersion.V9)
export const PrincipalEnum = {
  TestSystemName: "TestSystemName",
}
