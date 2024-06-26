import convict from "convict"
import { ClientException } from "../../errorHandling/exceptions/ClientException"
import * as validators from "convict-format-with-validator"
import { IApmConfig } from "./IApmConfig"
import { isProduction } from "./EnvironmentConfig"

convict.addFormat(validators.url)

export const DEFAULT_APM_CONFIG = (): IApmConfig =>
  Object.freeze({
    serviceName: undefined,
    serverUrl: undefined,
    transactionSampleRate: isProduction() ? 0.1 : 1,
    captureExceptions: false,
    centralConfig: false,
    metricsInterval: "10s",
    captureErrorLogStackTraces: "messages",
    captureBody: isProduction() ? "errors" : "all",
    captureHeaders: !isProduction(),
    enableLogs:
      process.env.ENABLE_LOGS === "true" || process.env.ENABLE_LOGS === "1" || process.env.ENABLE_LOGS === "yes",
  })

// Define the schema for the RetailCommonConfig object
const defaultConfig = DEFAULT_APM_CONFIG()
const schema = {
  envPrefix: {
    doc: "The environment letter such as d, t or p",
    format: String,
    default: null,
    env: "ENV_PREFIX",
  },
  isProduction: {
    doc: "Must be set to true if it is considered a production zone environment",
    format: Boolean,
    default: false,
    env: "IS_PRODUCTION",
  },
  systemName: {
    doc: "Name of the system",
    format: String,
    default: null,
    env: "SYSTEM_NAME",
  },
  enableConsoleLogs: {
    doc: "Whether to enable Console logs",
    format: Boolean,
    default: true,
    env: "CONSOLE_ENABLE_LOGS",
  },
  elk: {
    apm: {
      enableLogs: {
        doc: "Whether to enable APM logs",
        format: Boolean,
        default: defaultConfig.enableLogs,
        env: "APM_ENABLE_LOGS",
      },
      serviceName: {
        doc: "Name of the APM service",
        format: String,
        default: null,
        env: "APM_SERVICE_NAME",
      },
      serverUrl: {
        doc: "URL of the APM server",
        format: "url",
        default: null,
        env: "APM_SERVER_URL",
      },
      secretToken: {
        doc: "Secret token for APM authentication",
        format: String,
        default: "OVERRIDE_ME",
        env: "APM_SECRET_TOKEN",
      },
      transactionSampleRate: {
        doc: "Sample rate for APM transactions",
        format: Number,
        default: defaultConfig.transactionSampleRate,
        env: "APM_TRANSACTION_SAMPLE_RATE",
      },
      labels: {
        doc: "Labels to apply to APM transactions",
        format: Object,
        default: null,
        env: "APM_LABELS",
      },
      captureErrorLogStackTraces: {
        doc: "Whether to capture stack traces for APM error logs",
        format: Boolean,
        default: defaultConfig.captureErrorLogStackTraces,
        env: "APM_CAPTURE_ERROR_LOG_STACK_TRACES",
      },
      captureExceptions: {
        doc: "Whether to capture unhandled exceptions for APM",
        format: Boolean,
        default: defaultConfig.captureExceptions,
        env: "APM_CAPTURE_EXCEPTIONS",
      },
      centralConfig: {
        doc: "Whether to use central config for APM",
        format: Boolean,
        default: defaultConfig.centralConfig,
        env: "APM_CENTRAL_CONFIG",
      },
      metricsInterval: {
        doc: "Interval for APM metrics",
        format: Number,
        default: defaultConfig.metricsInterval,
        env: "APM_METRICS_INTERVAL",
      },
    },
    logstash: {
      isEnabled: {
        doc: "Whether to enable Logstash logging",
        format: Boolean,
        default: false,
        env: "LOGSTASH_ENABLED",
      },
      host: {
        doc: "Host for Logstash logging",
        format: String,
        default: "",
        env: "LOGSTASH_HOST",
      },
      port: {
        doc: "Port for Logstash logging",
        format: Number,
        default: null,
        env: "LOGSTASH_PORT",
      },
    },
  },
}

export class RetailCommonConfigConvict {
  public static validate(obj: any) {
    const myconvict = convict(schema)
    myconvict.load(obj)
    try {
      myconvict.validate()
    } catch (e) {
      const msg = `\n${e["message"]}`
      throw new ClientException("InvalidRetailCommonConfiguration", msg, { receivedConfig: obj }, e as Error)
    }
  }
}
