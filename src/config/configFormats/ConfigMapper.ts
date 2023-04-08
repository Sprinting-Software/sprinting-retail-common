import { LoggerConfig } from "../../logger/LoggerService"
import { AppConfig } from "./AppConfig"
import { ApmConfig } from "./ApmConfig";

export class ConfigMapper {
  public static mapToLoggerConfig(appConfig: AppConfig): LoggerConfig {
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

  static mapToApmConfig(appConfig: AppConfig): ApmConfig {
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
