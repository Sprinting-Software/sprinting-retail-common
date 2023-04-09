import { RetailCommonConfig } from "../interface/RetailCommonConfig"

const SYSTEM_NAME = "testSystemName"
export const TestConfig: RetailCommonConfig = {
  systemName: SYSTEM_NAME,
  envPrefix: "",
  elk: {
    apm: {
      serviceName: SYSTEM_NAME,
      serverUrl: "localhost:8200",
      centralConfig: false,
      captureErrorLogStackTraces: false,
      captureExceptions: false,
      enableLogs: false,
      labels: { someLabel: "someKey" },
      metricsInterval: 0,
    },
    logstash: { host: "", isEnabled: false, port: 0 },
  },
}
