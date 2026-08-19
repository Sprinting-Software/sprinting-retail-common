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
   * rotation, e.g. `logs-apm-a-bifrostbackend-error-2026.34`.
   */
  private buildIndexName(logType: LogLevel): string {
    const env = this.config.env.split("-")[0]
    const indexLogType = getIndexLogType(logType)
    return `logs-apm-${env}-${this.config.serviceName}-${indexLogType}-${getYearAndWeek()}`
  }

  /**
   * Logs an HTTP request/response payload if a configured rule matches the call and the
   * rule's sampling rate selects it. Bodies are redacted via StringUtils.redactAndTruncateForLogging
   * before being sent, since they may contain sensitive data.
   */
  httpPayload(params: HttpPayloadLogParams): void {
    const rule = matchHttpPayloadRule(this.config.httpPayloadLogging?.rules, params)
    if (!rule) return
    if (Math.random() >= rule.samplingRate) return

    const timestamp = new Date().toISOString()
    const env = this.config.env.split("-")[0]
    const doc: Record<string, any> = {
      direction: params.direction,
      verb: params.verb,
      domain: params.domain,
      path: params.path,
      statusCode: params.statusCode,
      requestBody:
        params.requestBody !== undefined ? StringUtils.redactAndTruncateForLogging(params.requestBody) : undefined,
      responseBody:
        params.responseBody !== undefined ? StringUtils.redactAndTruncateForLogging(params.responseBody) : undefined,
      system: this.config.serviceName,
      component: this.config.serviceName,
      env,
      systemEnv: `${env}-${this.config.serviceName}`,
      service: { name: this.config.serviceName, environment: env },
      labels: { envTags: this.config.envTags, ...this.getAsyncContext() },
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

  private buildHttpPayloadIndexName(): string {
    const env = this.config.env.split("-")[0]
    return `logs-apm-${env}-${this.config.serviceName}-httpPayload-${getYearAndWeek()}`
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
