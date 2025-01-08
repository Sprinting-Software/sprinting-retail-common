import { ConfigLegacyV1 } from "./ConfigLegacyV1"
import { LibConfig } from "../interface/LibConfig"
import { RetailCommonConfig } from "../interface/RetailCommonConfig"

const PRODUCTION_ENV_PREFIX = "p"

function isProduction(envPrefix: string) {
  return envPrefix.startsWith(PRODUCTION_ENV_PREFIX)
}

export class ConfigMapper {
  // Jan 2025: Nikola: This mapping of config is pretty horrible. We should
  // refactor it one day.
  public static mapToLoggerConfig(appConfig: RetailCommonConfig): LibConfig {
    return {
      env: appConfig.envPrefix, // `${appConfig.envPrefix}-env`,
      serviceName: appConfig.systemName,
      enableElkLogs: appConfig.elk.logstash.isEnabled,
      enableConsoleLogs: appConfig.enableConsoleLogs,
      elkRestApi: { ...appConfig.elk.restApi },
      elkLogstash: {
        isUDPEnabled: true,
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
