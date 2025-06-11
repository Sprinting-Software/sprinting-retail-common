import { UDPTransport } from "udp-transport-winston"
import * as winston from "winston"
import { ApmHelper } from "../apm/ApmHelper"
import { Injectable, OnApplicationShutdown, Scope } from "@nestjs/common"
import { Exception } from "../errorHandling/exceptions/Exception"
import { LibConfig } from "../config/interface/LibConfig"
import util from "util"
import { ExceptionUtil } from "../errorHandling/ExceptionUtil"
import { ServerException } from "../errorHandling/exceptions/ServerException"
import ecsFormat from "@elastic/ecs-winston-format"
import { IEventLogContext, LogLevel, LogMessage, LogMessageExtended } from "./types"
import { ElkBufferedTcpLogger } from "./ElkBufferedTcpLogger"
import { ElkRestApi } from "./ElkRestApi"
import { RawLogger } from "./RawLogger"
import { ExceptionConst } from "../errorHandling/exceptions/ExceptionConst"
import { ElkBufferedTcpSender } from "./ElkBufferedTcpSender"
import { AsyncContext } from "../asyncLocalContext/AsyncContext"

const { timestamp, printf, combine } = winston.format

const DEFAULT_TRUNCATION_LIMIT = 800

function formatEnvLetterWithDashEnv(env: string): string {
  if (env.length === 1) {
    return `${env}-env`
  } else return env
}

/**
 * If the env is something like "d-env", we want to format it as "d"
 * @param env
 */
function formatAsEnvLetter(env: string): string {
  if (env.indexOf("-") > -1) {
    return env.split("-")[0]
  } else return env
}
@Injectable({ scope: Scope.DEFAULT })
export class LoggerService implements /*OnModuleDestroy,*/ OnApplicationShutdown {
  private static logger: winston.Logger
  private static loggerConsoleOnly: winston.Logger
  private envDashEnv: string
  private envPrefix: string
  private tcpLoggerEvents: ElkBufferedTcpLogger
  private tcpLoggerErrors: ElkBufferedTcpLogger
  private tcpSender: ElkBufferedTcpSender
  udpTransport: UDPTransport

  // private readonly logstashClient: Logstash

  constructor(
    private readonly config: LibConfig,
    transports: any[] = [],
    private readonly contextProvider?: AsyncContext
  ) {
    const conf = {
      systemName: config.serviceName,
      host: config.elkLogstash.host,
      port: config.elkLogstash.port,
    }
    this.envDashEnv = formatEnvLetterWithDashEnv(config.env)
    this.envPrefix = formatAsEnvLetter(config.env)
    if (this.config.errorTruncationLimit !== undefined) {
      ExceptionConst.overrideTruncationLimitForExceptions(this.config.errorTruncationLimit)
    }

    if (config.elkLogstash.isUDPEnabled) {
      const udpTransport = new UDPTransport(conf)
      this.udpTransport = udpTransport
      transports.push(udpTransport)
    }

    if (config.elkRestApi?.useForEvents) {
      this.tcpLoggerEvents = this.initTcpLogger(config, "event")
    }

    if (config.elkRestApi?.enableTcpSender !== false) {
      // enableTcpSender should be turned on unless distinctly specified otherwise
      this.tcpSender = this.initTcpSender(config)
    }

    if (config.elkRestApi?.useForErrors) {
      // Find year and week number
      this.tcpLoggerErrors = this.initTcpLogger(config, "error")
    }
    // You can use this to get insight into what is sent to ELK
    /*const consoleLogFormatter = winston.format((info) => {
      console.log(info)
      return info
    })*/

    // const legacyLogstashFormatter = timestamp
    const ecsFormatter = combine(timestamp(), ecsFormat({ convertReqRes: true, apmIntegration: true }))
    const consoleFormatterForDevelopers = printf((args) => {
      const fileName = args.filename ? `| ${args.filename.split("/").pop()}` : ""
      return `${args.timestamp} | ${args["log.level"]} | ${args.message} ${fileName}`
    })
    if (!LoggerService.logger) {
      const consoleLogger = new winston.transports.Console({
        format: consoleFormatterForDevelopers,
      })
      const logLevel = this.config.logLevel || "debug"
      LoggerService.logger = winston.createLogger({
        format: ecsFormatter, // ecsFormatter,
        silent: !config.enableConsoleLogs,
        transports: [consoleLogger, ...transports],
        level: logLevel,
      })
      LoggerService.loggerConsoleOnly = winston.createLogger({
        format: ecsFormatter,
        silent: !config.enableConsoleLogs,
        transports: [consoleLogger],
        level: logLevel,
      })
    }
  }
  onApplicationShutdown() {
    this.destroyTcpLoggers().catch((err) => {
      RawLogger.debug("Error during logger cleanup", { error: err })
    })
    if (this.udpTransport) {
      try {
        this.udpTransport.close() // Important: prevent unhandled socket state
        this.udpTransport = null
      } catch (err) {
        RawLogger.debug("Error during UDP transport cleanup", { err })
      }
    }
    /*this.destroyTcpLoggers().catch((err) => {
      RawLogger.debug("Error during logger cleanup", { error: err })
    })*/
  }

  // Clean up on module destruction
  //onModuleDestroy() {}

  private async destroyTcpLoggers() {
    if (this.tcpLoggerEvents) {
      RawLogger.debug("Cleaning up logger...")
      await this.tcpLoggerEvents.flushAndStop() // Ensure remaining logs are flushed
      this.tcpLoggerEvents = null
    }
    if (this.tcpLoggerErrors) {
      RawLogger.debug("Cleaning up logger...")
      await this.tcpLoggerErrors.flushAndStop() // Ensure remaining logs are flushed
      this.tcpLoggerErrors = null
    }
    if (this.tcpSender) {
      RawLogger.debug("Cleaning up logger...")
      await this.tcpSender.flushAndStop() // Ensure remaining logs are flushed
      this.tcpSender = null
    }
  }

  private initTcpLogger(config: LibConfig, logType: "event" | "error") {
    if (!this.config.elkRestApi) return
    const yyyyww = getYearAndWeek()
    const tcpLogger = new ElkBufferedTcpLogger(
      new ElkRestApi({
        apiKey: config.elkRestApi.apiKey,
        endpoint: config.elkRestApi.endpoint,
        indexName: `${config.env}-${config.serviceName}-${logType}-${yyyyww}`,
      })
    )

    tcpLogger.start()
    return tcpLogger
  }

  private initTcpSender(config: LibConfig) {
    if (!this.config.elkRestApi) return
    const yyyyww = getYearAndWeek()
    const logType = "custom-index"
    const tcpSender = new ElkBufferedTcpSender(
      new ElkRestApi({
        apiKey: config.elkRestApi.apiKey,
        endpoint: config.elkRestApi.endpoint,
        indexName: `${config.env}-${config.serviceName}-${logType}-${yyyyww}`, // default index name
      })
    )

    tcpSender.start()
    return tcpSender
  }

  info(fileName: string, message: string, messageData?: Record<string, any>) {
    const doc = this.formatMessage(
      fileName,
      LogLevel.info,
      message,
      messageData,
      this.contextProvider?.getContextOrUndefined()
    )
    LoggerService.logger.info(doc)
  }

  debug(fileName: string, message: any, messageData?: Record<string, any>) {
    LoggerService.logger.debug(
      this.formatMessage(fileName, LogLevel.debug, message, messageData, this.contextProvider?.getContextOrUndefined())
    )
  }

  warn(fileName: string, message: string, messageData?: Record<string, any>) {
    LoggerService.logger.warn(this.formatMessage(fileName, LogLevel.warn, message, messageData, this.getAsyncContext()))
  }

  private getAsyncContext(): Record<string, any> {
    return this.contextProvider?.getContextOrUndefined()
  }

  event(
    fileName: string,
    eventName: string,
    eventCategory: string,
    eventDomain: string,
    eventData: any,
    message?: string,
    eventContext?: IEventLogContext
  ) {
    const ctx = this.getAsyncContext()

    const logMessage = this.formatMessage(
      fileName,
      LogLevel.event,
      message || `EVENT: ${eventName} ${eventCategory} ${eventDomain}`,
      undefined,
      ctx,
      true
    )

    logMessage.event = {
      name: eventName,
      category: eventCategory,
      domain: eventDomain,
      data: eventData,
      context: eventContext,
    }

    if (this.config?.elkRestApi?.useForEvents && this.tcpLoggerEvents) {
      this.enrichForTcpAndSend(logMessage, "event")
      LoggerService.loggerConsoleOnly.info(logMessage)
    } else {
      LoggerService.logger.info(logMessage)
    }
  }

  sendToIndex({ indexName, id, data }: { indexName: string; id: string; data: Record<string, any> }) {
    this.tcpSender.sendObject({
      indexName,
      id,
      data: {
        env: this.envPrefix,
        ...data,
      },
    })
    LoggerService.loggerConsoleOnly.info("Sent to index", { indexName, id })
  }

  private enrichForTcpAndSend(logMessage: LogMessage, type: "event" | "error") {
    const timestamp = new Date().toISOString()
    const eventObj: LogMessageExtended = {
      ...logMessage,
      "@timestamp": timestamp,
      timestamp: timestamp,
      meta: { sentViaRestApi: true },
    }
    const tx = ApmHelper.Instance.getApmAgent().currentTransaction
    if (tx) {
      eventObj["trace.id"] = tx.ids["trace.id"]
      eventObj["transaction.id"] = tx.ids["transaction.id"]
    }
    if (type === "event") this.tcpLoggerEvents.sendObject(eventObj)
    else this.tcpLoggerErrors.sendObject(eventObj)
  }

  /**
   * Log an Exception or any kind of Error. If you log an Error, it will be parsed into a ServerException.
   * @param error
   * @param contextData For some additional data relevant to the error. This context data will be added to the exceptions context data.
   */
  logError(error: Exception | Error | unknown, contextData?: Record<string, any>) {
    const exception = ExceptionUtil.parse(error)
    if (contextData) exception.setContextData(contextData)
    ApmHelper.Instance.captureError(exception)
    const fileName = LoggerService._getCallerFile()
    let exceptionString = exception.toString()

    if (this.config.elkRestApi?.useForErrors) {
      // We don't need to truncate by default when sending errors via the REST API
      // But we may still do it if this.config.errorTruncationLimit is explicitly set above 0
      if (this.config.errorTruncationLimit && this.config.errorTruncationLimit > 0) {
        exceptionString = this.truncateString(exceptionString, this.config.errorTruncationLimit)
      }
    } else {
      // truncate to avoid logs being lost unless explicitly set to 0 or below.
      const limit =
        this.config.errorTruncationLimit !== undefined ? this.config.errorTruncationLimit : DEFAULT_TRUNCATION_LIMIT
      if (limit > 0) {
        exceptionString = this.truncateString(
          exceptionString,
          this.config.errorTruncationLimit || DEFAULT_TRUNCATION_LIMIT
        )
      }
    }
    const fullContextData = exception.contextData
    const formatedMessage = this.formatMessage(
      fileName,
      LogLevel.error,
      exceptionString,
      fullContextData,
      this.getAsyncContext()
    )
    if (this.config.elkRestApi?.useForErrors && this.tcpLoggerErrors) {
      this.enrichForTcpAndSend(formatedMessage, "error")
      LoggerService.loggerConsoleOnly.error(formatedMessage)
    } else {
      LoggerService.logger.error(formatedMessage)
    }
  }

  private truncateString(exceptionString: string, limit: number): string {
    const TRUNCAION_MESSAGE = "...(truncated due to UDP limit)"
    if (exceptionString.length <= limit) return exceptionString
    return `${exceptionString.substring(0, limit - TRUNCAION_MESSAGE.length)}${TRUNCAION_MESSAGE}`
  }

  /**
   * Convenience function to log a ServerException with a given errorName, description, contextData and innerError
   * @param errorName
   * @param description
   * @param contextData
   * @param innerError
   */
  logException(errorName: string, description?: string, contextData: Record<string, any> = {}, innerError?: Error) {
    this.logError(new ServerException(errorName, description, contextData, innerError))
  }
  formatMessage(
    fileName: string,
    logLevel: LogLevel,
    message: string,
    data?: Record<string, any>,
    context?: Record<string, any> | undefined,
    isEvent = false
  ): LogMessage {
    const obj: LogMessage = {
      filename: fileName,
      system: this.config.serviceName,
      component: this.config.serviceName,
      env: this.envPrefix,
      systemEnv: `${this.envPrefix}-${this.config.serviceName}`,
      logType: logLevel,
      labels: { envTags: this.config.envTags },
      message: message + (data ? ` ${util.inspect(data, false, 10)}` : ""),
      service: { name: this.config.serviceName, environment: this.envPrefix }, // Add these fields to make it compliant with APM ELK
      processor: { event: isEvent ? "event" : logLevel },
    }
    if (context) {
      // Add the context to the labels to make it compliant with APM ELK
      obj.labels = { ...obj.labels, ...context }
    }
    return obj
  }

  private static _getCallerFile(error?: Error) {
    const _pst = Error.prepareStackTrace
    const stackTraceLimit = Error.stackTraceLimit

    Error.prepareStackTrace = function (err, stack) {
      return stack
    }
    Error.stackTraceLimit = 3

    let err = error
    if (error === undefined) err = new Error()
    const stack = err.stack
    Error.prepareStackTrace = _pst
    Error.stackTraceLimit = stackTraceLimit

    const stackFrame = stack[2] as unknown as NodeJS.CallSite
    return stackFrame.getFileName()
  }
}

function getYearAndWeek() {
  const date = new Date()
  const year = date.getFullYear()
  const firstDayOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1
  const weekNumber = Math.ceil((dayOfYear + firstDayOfYear.getDay()) / 7)
  const yyyyww = `${year}.${weekNumber.toString().padStart(2, "0")}`
  return yyyyww
}
