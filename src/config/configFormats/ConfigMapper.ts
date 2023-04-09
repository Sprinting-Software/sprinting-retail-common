import { RetailCommonConfigLegacy } from "./RetailCommonConfigLegacy"
import { ElkConfig } from "./ElkConfig";
import { LoggerConfig } from "../../logger/LoggerConfig";

export class ConfigMapper {
  public static mapToLoggerConfig(appConfig: RetailCommonConfigLegacy): LoggerConfig {
    const elkConfig = appConfig.elkConfig
    return {
      env: appConfig.envPrefix,
      serviceName: elkConfig.serviceName,
      enableLogs: elkConfig.sendLogsToElk,
      logstash: {
        isUDPEnabled: true,
        host: elkConfig.logstashConfig.hostname,
        port: elkConfig.logstashConfig.port,
      },
    }
  }

  static mapToElkConfig(appConfig: RetailCommonConfigLegacy): ElkConfig {
    const elkConfig = appConfig.elkConfig
    return {
      serviceName: elkConfig.serviceName,
      serverUrl: `${elkConfig.hostname}:${elkConfig.port}`,
      secretToken: elkConfig.serviceSecret,
      enableLogs: elkConfig.sendLogsToElk,
      transactionSampleRate: 1,
    }
  }
}
