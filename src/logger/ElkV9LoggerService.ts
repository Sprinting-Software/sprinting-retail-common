import { Injectable } from "@nestjs/common"
import ecsFormat from "@elastic/ecs-winston-format"
import util from "util"
import * as winston from "winston"
import { AsyncContext } from "../asyncLocalContext/AsyncContext"
import { ApmHelper } from "../apm/ApmHelper"
import { ElkV9Config, LibConfig } from "../config/interface/LibConfig"
import { ExceptionUtil } from "../errorHandling/ExceptionUtil"
import { Exception } from "../errorHandling/exceptions/Exception"
import { ServerException } from "../errorHandling/exceptions/ServerException"
import { IEventLogContext, LogLevel, LogMessage, LogMessageExtended } from "./types"
import { BulkLogService } from "./BulkLogService"
import { HttpPayloadLogParams, LoggerService } from "./LoggerService"
import { matchHttpPayloadRule } from "./HttpPayloadRuleMatcher"
import { StringUtils } from "../helpers/StringUtils"

const { combine, printf, timestamp } = winston.format

// Kept in sync conceptually with LegacyLoggerService's own getYearAndWeek(), but duplicated
// rather than shared — the two logger implementations are intentionally independent.
function getYearAndWeek(): string {
  const date = new Date()
  const year = date.getFullYear()
  const firstDayOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1
  const weekNumber = Math.ceil((dayOfYear + firstDayOfYear.getDay()) / 7)
  return `${year}.${weekNumber.toString().padStart(2, "0")}`
}

type IndexLogType = "event" | "error" | "log"

function getIndexLogType(logType: LogLevel): IndexLogType {
  if (logType === LogLevel.event) return "event"
  if (logType === LogLevel.error) return "error"
  return "log"
}

@Injectable()
export class ElkV9LoggerService extends LoggerService {
  private readonly consoleLogger: winston.Logger

  constructor(
    private readonly config: LibConfig & ElkV9Config,
    private readonly bulk: BulkLogService,
    private readonly asyncContext?: AsyncContext
  ) {
    super()
    const ecsFormatter = combine(timestamp(), ecsFormat({ convertReqRes: true, apmIntegration: true }))
    const consoleFormatter = printf((args) => {
      const fileName = args.filename ? `| ${args.filename.split("/").pop()}` : ""
      return `${args.timestamp} | ${args["log.level"]} | ${args.message} | ${fileName}`
    })
    this.consoleLogger = winston.createLogger({
      format: ecsFormatter,
      level: config.logLevel || "debug",
      silent: config.enableConsoleLogs === false,
      transports: [new winston.transports.Console({ format: consoleFormatter })],
    })
  }

  info(fileName: string, message: string, messageData?: Record<string, any>): void {
    this.write(LogLevel.info, message, fileName, messageData)
  }

  debug(fileName: string, message: any, messageData?: Record<string, any>): void {
    this.write(LogLevel.debug, String(message), fileName, messageData)
  }

  warn(fileName: string, message: string, messageData?: Record<string, any>): void {
    this.write(LogLevel.warn, message, fileName, messageData)
  }

  log(message: any, context?: string): void {
    this.write(LogLevel.info, String(message), context)
  }

  error(message: any, context?: string): void {
    this.logError(message instanceof Error ? message : new Error(String(message)), context ? { context } : undefined)
  }

  verbose(message: any, context?: string): void {
    this.write(LogLevel.debug, String(message), context)
  }

  event(
    fileName: string,
    eventName: string,
    eventCategory: string,
    eventDomain: string,
    eventData: any,
    message?: string,
    eventContext?: IEventLogContext,
    customData?: Record<string, any>
  ): void {
    this.write(LogLevel.event, message || `EVENT: ${eventName} ${eventCategory} ${eventDomain}`, fileName, undefined, {
      name: eventName,
      category: eventCategory,
      domain: eventDomain,
      data: eventData,
      context: eventContext,
      custom: customData,
    })
  }

  logError(error: Exception | Error, contextData?: Record<string, any>): void {
    const exception = ExceptionUtil.parse(error)
    if (contextData) exception.setContextData(contextData)
    ApmHelper.Instance.captureError(exception)

    let exceptionString = exception.toString()
    if (this.config.errorTruncationLimit && this.config.errorTruncationLimit > 0) {
      exceptionString = this.truncateString(exceptionString, this.config.errorTruncationLimit)
    }
    const formattedMessage = this.formatMessage(
      ElkV9LoggerService._getCallerFile(),
      LogLevel.error,
      exceptionString,
      exception.contextData,
      this.getAsyncContext()
    )
    this.enrichAndSend(formattedMessage)
  }

  logException(
    errorName: string,
    description?: string,
    contextData: Record<string, any> = {},
    innerError?: Error
  ): void {
    this.logError(new ServerException(errorName, description, contextData, innerError))
  }

  formatMessage(
    fileName: string,
    logLevel: LogLevel,
    message: string,
    data?: Record<string, any>,
    context?: Record<string, any>,
    isEvent = false
  ): LogMessage {
    const env = this.config.env.split("-")[0]
    return {
      filename: fileName,
      system: this.config.serviceName,
      component: this.config.serviceName,
      env,
      systemEnv: `${env}-${this.config.serviceName}`,
      logType: logLevel,
      labels: { envTags: this.config.envTags, ...context },
      message: message + (data ? ` ${util.inspect(data, false, 10)}` : ""),
      service: { name: this.config.serviceName, environment: env },
      processor: { event: isEvent ? "event" : logLevel },
    }
  }

  private getAsyncContext(): Record<string, any> | undefined {
    return this.asyncContext?.getContextOrUndefined<Record<string, any>>()
  }

  private write(
    level: LogLevel,
    message: string,
    context?: string,
    data?: Record<string, any>,
    event?: Record<string, any>
  ): void {
    try {
      const logMessage = this.formatMessage(
        context || "",
        level,
        message,
        data,
        this.getAsyncContext(),
        level === LogLevel.event
      )
      if (event) logMessage.event = event
      this.enrichAndSend(logMessage)
    } catch (error) {
      try {
        // eslint-disable-next-line no-console
        console.log("Failed to queue ELK v9 log", error, { level, message, context, data, event })
      } catch {
        // Logging must never crash application code.
      }
    }
  }

  private enrichAndSend(logMessage: LogMessage): void {
    const timestamp = new Date().toISOString()
    const eventObj: LogMessageExtended = {
      ...logMessage,
      "log.level": logMessage.logType === LogLevel.event ? LogLevel.info : logMessage.logType,
      "@timestamp": timestamp,
      timestamp,
      meta: { sentViaRestApi: true },
    }
    const tx = ApmHelper.Instance.getApmAgent().currentTransaction
    if (tx) {
      eventObj["trace.id"] = tx.ids["trace.id"]
      eventObj["transaction.id"] = tx.ids["transaction.id"]
    }
    this.consoleLogger.log(logMessage.logType === LogLevel.event ? LogLevel.info : logMessage.logType, { ...eventObj })
    this.bulk.log(this.buildIndexName(logMessage.logType), eventObj)
  }

  /**
   * Builds the target index name for a log, split by type (event/error/log) with weekly
   * rotation, e.g. `a-bifrostbackend-error-2026.34`. Deliberately matches LegacyLoggerService's
   * own index naming (`${env}-${serviceName}-${logType}-${yyyy.ww}`, see initTcpLogger) rather
   * than a `logs-apm-` prefix: that prefix collides with Kibana's APM app's own index pattern,
   * which pulls these (non-APM-shaped) documents into trace views it can't render, breaking them.
   */
  private buildIndexName(logType: LogLevel): string {
    const env = this.config.env.split("-")[0]
    const indexLogType = getIndexLogType(logType)
    return `${env}-${this.config.serviceName}-${indexLogType}-${getYearAndWeek()}`.toLowerCase()
  }

  /**
   * Logs an HTTP request/response payload, subject to the configured sampling rate. A matching
   * rule (see HttpPayloadRuleMatcher) overrides `defaultSamplingRate`/`logRequest`/`logResponse`
   * for that call; otherwise the config's `defaultSamplingRate` applies (with both bodies logged).
   * Bodies and headers are redacted via StringUtils.redactAndTruncateForLogging before being sent,
   * since they may contain sensitive data. Header redaction additionally always prunes
   * authorization/cookie-style keys, which aren't covered by the default sensitive-word list.
   */
  httpPayload(params: HttpPayloadLogParams): void {
    const config = this.config.httpPayloadLogging
    if (!config) return

    const rule = matchHttpPayloadRule(config.rules, params)
    const samplingRate = rule?.samplingRate ?? config.defaultSamplingRate
    if (Math.random() >= samplingRate) return

    const logRequest = rule?.logRequest ?? true
    const logResponse = rule?.logResponse ?? true

    const timestamp = new Date().toISOString()
    const env = this.config.env.split("-")[0]
    const doc: Record<string, any> = {
      direction: params.direction,
      method: params.method,
      domain: params.domain,
      path: params.path,
      route: params.route ?? params.path,
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
          headers: ElkV9LoggerService.redactHeaders(params.headers, ElkV9LoggerService.NOISE_REQUEST_HEADER_KEYS),
        }),
      ...(logResponse &&
        params.responseHeaders !== undefined && {
          responseHeaders: ElkV9LoggerService.redactHeaders(
            params.responseHeaders,
            ElkV9LoggerService.NOISE_RESPONSE_HEADER_KEYS
          ),
        }),
      responseTime: params.responseTime,
      error: params.error !== undefined ? StringUtils.redactAndTruncateForLogging(params.error) : undefined,
      system: this.config.serviceName,
      component: this.config.serviceName,
      env,
      systemEnv: `${env}-${this.config.serviceName}`,
      service: { name: this.config.serviceName, environment: env },
      labels: { envTags: this.config.envTags, ...this.getAsyncContext() },
      logType: "httpPayload",
      httpLogType: params.direction === "inbound" ? "InboundHttpCall" : "OutboundHttpCall",
      "log.level": LogLevel.info,
      "@timestamp": timestamp,
      timestamp,
    }
    const tx = ApmHelper.Instance.getApmAgent().currentTransaction
    if (tx) {
      doc["trace.id"] = tx.ids["trace.id"]
      doc["transaction.id"] = tx.ids["transaction.id"]
    }
    this.consoleLogger.log(LogLevel.info, doc)
    this.bulk.log(this.buildHttpPayloadIndexName(), doc)
  }

  // Noise headers dropped before logging (transport/boilerplate, not sensitive) — matches the
  // convention already used in Club's LogContext.ts (filteredRequestHeaders/filteredResponseHeaders).
  private static readonly NOISE_REQUEST_HEADER_KEYS = [
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
  private static readonly NOISE_RESPONSE_HEADER_KEYS = [
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
  private static redactHeaders(headers: Record<string, any>, noiseKeys: string[]): Record<string, any> {
    const noiseKeySet = new Set(noiseKeys)
    const filtered = Object.fromEntries(Object.entries(headers).filter(([key]) => !noiseKeySet.has(key.toLowerCase())))
    return StringUtils.redactAndTruncateForLogging(filtered)
  }

  private buildHttpPayloadIndexName(): string {
    const env = this.config.env.split("-")[0]
    return `${env}-${this.config.serviceName}-httpPayload-${getYearAndWeek()}`.toLowerCase()
  }

  private static _getCallerFile(error?: Error) {
    const prepareStackTrace = Error.prepareStackTrace
    const stackTraceLimit = Error.stackTraceLimit
    Error.prepareStackTrace = (_error, stack) => stack
    Error.stackTraceLimit = 3
    const stack = (error ?? new Error()).stack
    Error.prepareStackTrace = prepareStackTrace
    Error.stackTraceLimit = stackTraceLimit
    return (stack[2] as unknown as NodeJS.CallSite).getFileName()
  }

  private truncateString(exceptionString: string, limit: number): string {
    const truncationMessage = "...(truncated due to configured limit)"
    if (exceptionString.length <= limit) return exceptionString
    return `${exceptionString.substring(0, limit - truncationMessage.length)}${truncationMessage}`
  }
}
