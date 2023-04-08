import { LoggerConfig } from "../logger/LoggerService"
import { ApmConfig } from "../apm/ApmHelper"
import { IConfigRoot } from "./IConfigRoot"

export class ConfigMapper {
  public static mapToLoggerConfig(appConfig: IConfigRoot): LoggerConfig {
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

  static mapToApmConfig(appConfig: IConfigRoot): ApmConfig {
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
