import { ConfigLegacyV1 } from "./ConfigLegacyV1"
import { LoggerConfig } from "../../logger/LoggerConfig"
import { RetailCommonConfig } from "../interface/RetailCommonConfig"

export class ConfigMapper {
  public static mapToLoggerConfig(appConfig: RetailCommonConfig): LoggerConfig {
    return {
      env: `${appConfig.envPrefix}-env`,
      serviceName: appConfig.systemName,
      enableLogs: appConfig.elk.logstash.isEnabled,
      logstash: {
        isUDPEnabled: true,
        host: appConfig.elk.logstash.host,
        port: appConfig.elk.logstash.port,
      },
    }
  }

  public static mapToRetailCommon(appConfig: ConfigLegacyV1): RetailCommonConfig {
    return {
      envPrefix: appConfig.envPrefix,
      systemName: appConfig.elkConfig.serviceName,
      elk: {
        apm: {
          serviceName: appConfig.elkConfig.serviceName,
          serverUrl: `${appConfig.elkConfig.hostname}:${appConfig.elkConfig.port}`,
          secretToken: appConfig.elkConfig.serviceSecret,
          enableLogs: appConfig.elkConfig.sendLogsToElk,
        },
        logstash: {
          isEnabled: true,
          host: appConfig.elkConfig.hostname,
          port: appConfig.elkConfig.port,
        },
      },
    }
  }
}
