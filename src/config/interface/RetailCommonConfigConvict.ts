import convict from "convict"
import { ClientException } from "../../errorHandling/ClientException"
import * as validators from "convict-format-with-validator"
convict.addFormat(validators.url)

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
  elk: {
    apm: {
      enableLogs: {
        doc: "Whether to enable APM logs",
        format: Boolean,
        default: true,
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
        default: 1,
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
        default: false,
        env: "APM_CAPTURE_ERROR_LOG_STACK_TRACES",
      },
      captureExceptions: {
        doc: "Whether to capture unhandled exceptions for APM",
        format: Boolean,
        default: false,
        env: "APM_CAPTURE_EXCEPTIONS",
      },
      centralConfig: {
        doc: "Whether to use central config for APM",
        format: Boolean,
        default: false,
        env: "APM_CENTRAL_CONFIG",
      },
      metricsInterval: {
        doc: "Interval for APM metrics",
        format: Number,
        default: undefined,
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