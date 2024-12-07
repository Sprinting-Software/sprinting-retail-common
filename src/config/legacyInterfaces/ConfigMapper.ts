import { ConfigLegacyV1 } from "./ConfigLegacyV1"
import { LoggerConfig } from "../../logger/LoggerConfig"
import { RetailCommonConfig } from "../interface/RetailCommonConfig"

const PRODUCTION_ENV_PREFIX = "p"

function isProduction(envPrefix: string) {
  return envPrefix.startsWith(PRODUCTION_ENV_PREFIX)
}

export class ConfigMapper {
  public static mapToLoggerConfig(appConfig: RetailCommonConfig): LoggerConfig {
    return {
      env: appConfig.envPrefix, // `${appConfig.envPrefix}-env`,
      serviceName: appConfig.systemName,
      enableLogs: appConfig.elk.logstash.isEnabled,
      enableConsoleLogs: appConfig.enableConsoleLogs,
      logstash: {
        isUDPEnabled: appConfig.elk.logstash.type === "udp" || appConfig.elk.logstash.type === undefined,
        isTCPEnabled: appConfig.elk.logstash.type === "tcp",
        host: appConfig.elk.logstash.host,
        port: appConfig.elk.logstash.port,
      },
    }
  }

  public static mapToRetailCommon(appConfig: ConfigLegacyV1): RetailCommonConfig {
    return {
      isProduction: isProduction(appConfig.envPrefix),
      envPrefix: appConfig.envPrefix,
      systemName: appConfig.elkConfig.serviceName,
      enableConsoleLogs: appConfig.enableConsoleLogs,
      elk: {
        apm: {
          serviceName: appConfig.elkConfig.serviceName,
          serverUrl: `${appConfig.elkConfig.hostname}:${appConfig.elkConfig.port}`,
          secretToken: appConfig.elkConfig.serviceSecret,
          enableLogs: appConfig.elkConfig.sendLogsToElk,
          ...appConfig.elkConfig,
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
