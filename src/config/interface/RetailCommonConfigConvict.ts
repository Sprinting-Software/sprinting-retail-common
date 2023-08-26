import convict from "convict"
import { ClientException } from "../../errorHandling/exceptions/ClientException"
import * as validators from "convict-format-with-validator"
import { ApmConfig } from "./ApmConfig"
convict.addFormat(validators.url)

function isProd() {
  // We use the convention that all variations of p-, p{number}- and production are considered production environments
  return process.env.NODE_ENV && process.env.NODE_ENV.charAt(0) === "p"
}
export const DEFAULT_APM_CONFIG: Partial<ApmConfig> = {
  transactionSampleRate: 1,
  captureExceptions: false,
  centralConfig: false,
  metricsInterval: "120s",
  captureErrorLogStackTraces: "messages",
  captureBody: isProd() ? "errors" : "all",
  captureHeaders: !isProd(),
  enableLogs: false,
}

// Define the schema for the RetailCommonConfig object
const schema = {
  envPrefix: {
    doc: "The environment letter such as d, t or p",
    format: String,
    default: null,
    env: "ENV_PREFIX",
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
        default: DEFAULT_APM_CONFIG.enableLogs,
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
        default: DEFAULT_APM_CONFIG.transactionSampleRate,
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
        default: DEFAULT_APM_CONFIG.captureErrorLogStackTraces,
        env: "APM_CAPTURE_ERROR_LOG_STACK_TRACES",
      },
      captureExceptions: {
        doc: "Whether to capture unhandled exceptions for APM",
        format: Boolean,
        default: DEFAULT_APM_CONFIG.captureExceptions,
        env: "APM_CAPTURE_EXCEPTIONS",
      },
      centralConfig: {
        doc: "Whether to use central config for APM",
        format: Boolean,
        default: DEFAULT_APM_CONFIG.centralConfig,
        env: "APM_CENTRAL_CONFIG",
      },
      metricsInterval: {
        doc: "Interval for APM metrics",
        format: Number,
        default: DEFAULT_APM_CONFIG.metricsInterval,
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
      const e2 = new ClientException("InvalidRetailCommonConfiguration", msg, { receivedConfig: obj }, e as Error)
      throw e2
    }
  }
}
