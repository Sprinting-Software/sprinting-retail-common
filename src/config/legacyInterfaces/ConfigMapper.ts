import { ConfigLegacyV1 } from "./ConfigLegacyV1"
import { BaseLibConfig, ElkV7Config, ElkV9Config, ElkVersion, LibConfig } from "../interface/LibConfig"
import { RetailCommonConfig } from "../interface/RetailCommonConfig"

const PRODUCTION_ENV_PREFIX = "p"

function isProduction(envPrefix: string) {
  return envPrefix.startsWith(PRODUCTION_ENV_PREFIX)
}
export class ConfigMapper {
  // --- Helpers ---
  private static buildDataStream(appConfig: RetailCommonConfig): string {
    return `logs-${appConfig.systemName}-${appConfig.envPrefix}`
  }

  public static mapToLoggerConfig(
    appConfig: RetailCommonConfig,
    version?: typeof ElkVersion.V7
  ): LibConfig & ElkV7Config

  public static mapToLoggerConfig(appConfig: RetailCommonConfig, version: typeof ElkVersion.V9): LibConfig & ElkV9Config

  public static mapToLoggerConfig(
    appConfig: RetailCommonConfig,
    version: ElkVersion = ElkVersion.V7
  ): LibConfig & (ElkV7Config | ElkV9Config) {
    const base = this.mapBase(appConfig)

    switch (version) {
      case ElkVersion.V9:
        return {
          ...base,
          ...this.mapV9(appConfig),
        }

      case ElkVersion.V7:
      default:
        return {
          ...base,
          ...this.mapV7(appConfig),
        }
    }
  }

  // --- Base config ---
  private static mapBase(appConfig: RetailCommonConfig): BaseLibConfig {
    return {
      env: appConfig.envPrefix,
      serviceName: appConfig.systemName,
      envTags: appConfig.elk.envTags,
      logLevel: appConfig.elk.logLevel,
      enableConsoleLogs: appConfig.enableConsoleLogs,
    }
  }

  // --- V9 ---
  private static mapV9(appConfig: RetailCommonConfig): {
    elkVersion: typeof ElkVersion.V9
    elkRestApi: ElkV9Config["elkRestApi"]
  } {
    const restApi = appConfig.elk.restApi

    if (!restApi) {
      throw new Error("ELK V9 requires elk.restApi configuration")
    }

    return {
      elkVersion: ElkVersion.V9,
      elkRestApi: {
        endpoint: restApi.endpoint,
        apiKey: restApi.apiKey,
        dataStream: this.buildDataStream(appConfig),
      },
    }
  }

  // --- V7 ---
  private static mapV7(appConfig: RetailCommonConfig): ElkV7Config & {
    elkVersion: typeof ElkVersion.V7
  } {
    return {
      elkVersion: ElkVersion.V7,
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
