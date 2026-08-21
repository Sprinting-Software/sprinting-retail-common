import { ApmHelper } from "../apm/ApmHelper"
import { StringUtils } from "../helpers/StringUtils"
import { HttpPayloadLoggingConfig } from "../config/interface/LibConfig"
import { HttpPayloadLogParams } from "./LoggerService"
import { matchHttpPayloadRule } from "./HttpPayloadRuleMatcher"
import { LogLevel } from "./types"

// Noise headers dropped before logging (transport/boilerplate, not sensitive) — matches the
// convention already used in Club's LogContext.ts (filteredRequestHeaders/filteredResponseHeaders).
const NOISE_REQUEST_HEADER_KEYS = [
  "accept",
  "host",
  "accept-encoding",
  "user-agent",
  "content-type",
  "content-length",
  "connection",
  "cache-control",
  "postman-token",
  "x-forwarded-for",
  "x-forwarded-proto",
  "x-forwarded-port",
  "x-amzn-trace-id",
]
const NOISE_RESPONSE_HEADER_KEYS = [
  "accept-ranges",
  "access-control-expose-headers",
  "cache-control",
  "content-length",
  "content-type",
  "vary",
]

/**
 * Drops noise headers, then applies the default sensitive-word redaction (password/secret/token/
 * apikey/etc). Deliberately does NOT redact authorization/cookie itself — callers (e.g. Club) may
 * already mask those before calling httpPayload(), and forcing our own redaction here would
 * clobber an already-masked value. Callers that don't pre-mask sensitive headers are responsible
 * for doing so before calling httpPayload().
 */
function redactHeaders(headers: Record<string, any>, noiseKeys: string[]): Record<string, any> {
  const noiseKeySet = new Set(noiseKeys)
  const filtered = Object.fromEntries(Object.entries(headers).filter(([key]) => !noiseKeySet.has(key.toLowerCase())))
  return StringUtils.redactAndTruncateForLogging(filtered)
}

export type HttpPayloadDocContext = {
  serviceName: string
  env: string
  envTags?: string
  asyncContextData?: Record<string, any>
}

/**
 * Decides whether an HTTP call should be logged (rule match + sampling), and if so, builds the
 * fully redacted document ready to send. Returns undefined when the call should not be logged
 * (no config, or sampled out). Shared between ElkV9LoggerService and LegacyLoggerService so both
 * loggers apply identical matching/sampling/redaction/shape rules — only the transport (how the
 * returned document actually gets sent) differs per logger.
 */
export function buildHttpPayloadDocument(
  params: HttpPayloadLogParams,
  httpConfig: HttpPayloadLoggingConfig | undefined,
  context: HttpPayloadDocContext
): Record<string, any> | undefined {
  if (!httpConfig) return undefined

  const rule = matchHttpPayloadRule(httpConfig.rules, params)
  const samplingRate = rule?.samplingRate ?? httpConfig.defaultSamplingRate
  if (Math.random() >= samplingRate) return undefined

  const logRequest = rule?.logRequest ?? true
  const logResponse = rule?.logResponse ?? true

  const timestamp = new Date().toISOString()
  const env = context.env.split("-")[0]
  const httpLogType = params.direction === "inbound" ? "InboundHttpCall" : "OutboundHttpCall"
  // Kibana's APM trace "Logs" tab only picks up documents that look like a log record (it needs
  // a message + processor.event to render/correlate them) -- log/event/error already have both;
  // httpPayload didn't, which is why it never showed up there even with trace.id/transaction.id set.
  const message = `${httpLogType}: ${params.method ?? ""} ${params.domain ?? ""}${params.path ?? ""} -> ${
    params.statusCode ?? params.error ?? "ERROR"
  }`.trim()
  const doc: Record<string, any> = {
    message,
    direction: params.direction,
    // Prefixed with "http" (httpMethod/httpDomain/httpPath/httpRoute), not method/domain/path/
    // route, to make clear these describe the HTTP call being logged -- for an outbound call,
    // that's NOT the same as the inbound request that triggered it (see labels.requestRoute,
    // which always describes the latter). A bare "route" here reads as "the current request's
    // route" and is easy to misinterpret, especially since both can appear on the same document.
    httpMethod: params.method,
    httpDomain: params.domain,
    httpPath: params.path,
    httpRoute: params.route ?? params.path,
    ...(params.requestTraceId !== undefined && { requestTraceId: params.requestTraceId }),
    statusCode: params.statusCode,
    success: params.success ?? (params.statusCode !== undefined ? params.statusCode < 300 : undefined),
    ...(logRequest &&
      params.payload !== undefined && {
        payload: StringUtils.redactAndTruncateForLogging(params.payload),
      }),
    ...(logResponse &&
      params.responsePayload !== undefined && {
        responsePayload: StringUtils.redactAndTruncateForLogging(params.responsePayload),
      }),
    ...(logRequest &&
      params.headers !== undefined && {
        headers: redactHeaders(params.headers, NOISE_REQUEST_HEADER_KEYS),
      }),
    ...(logResponse &&
      params.responseHeaders !== undefined && {
        responseHeaders: redactHeaders(params.responseHeaders, NOISE_RESPONSE_HEADER_KEYS),
      }),
    responseTime: params.responseTime,
    error: params.error !== undefined ? StringUtils.redactAndTruncateForLogging(params.error) : undefined,
    system: context.serviceName,
    component: context.serviceName,
    env,
    systemEnv: `${env}-${context.serviceName}`,
    service: { name: context.serviceName, environment: env },
    labels: { envTags: context.envTags, ...context.asyncContextData },
    logType: "httpPayload",
    httpLogType,
    processor: { event: LogLevel.info },
    "log.level": LogLevel.info,
    "@timestamp": timestamp,
    timestamp,
  }
  const tx = ApmHelper.Instance.getApmAgent().currentTransaction
  if (tx) {
    doc["trace.id"] = tx.ids["trace.id"]
    doc["transaction.id"] = tx.ids["transaction.id"]
  }
  return doc
}
