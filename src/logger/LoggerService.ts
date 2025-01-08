import { UDPTransport } from "udp-transport-winston"
import * as winston from "winston"
import { ApmHelper } from "../apm/ApmHelper"
import { Injectable, OnApplicationShutdown, OnModuleDestroy, Scope } from "@nestjs/common"
import { Exception } from "../errorHandling/exceptions/Exception"
import { LibConfig } from "../config/interface/LibConfig"
import util from "util"
import { ExceptionUtil } from "../errorHandling/ExceptionUtil"
import { ServerException } from "../errorHandling/exceptions/ServerException"
import ecsFormat from "@elastic/ecs-winston-format"
import { ICommonLogContext, LogLevel, LogMessage } from "./types"
import { ElkBufferedTcpLogger } from "./ElkBufferedTcpLogger"
import { ElkRestApi } from "./ElkRestApi"
import { RawLogger } from "./RawLogger"

const { timestamp, printf, combine } = winston.format

function getTenantMoniker(tenantId: number) {
  return `tid${tenantId}`
}

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
export class LoggerService implements OnModuleDestroy, OnApplicationShutdown {
  private static logger: winston.Logger
  private envDashEnv: string
  private envPrefix: string
  private tcpLogger: ElkBufferedTcpLogger

  // private readonly logstashClient: Logstash

  constructor(private readonly config: LibConfig, transports: any[] = []) {
    const conf = {
      systemName: config.serviceName,
      host: config.elkLogstash.host,
      port: config.elkLogstash.port,
    }
    this.envDashEnv = formatEnvLetterWithDashEnv(config.env)
    this.envPrefix = formatAsEnvLetter(config.env)

    if (config.elkLogstash.isUDPEnabled) {
      transports.push(new UDPTransport(conf))
    }

    if (config.elkRestApi?.useForEvents) {
      // Find year and week number
      this.initTcpLogger(config)
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
      LoggerService.logger = winston.createLogger({
        format: ecsFormatter, // ecsFormatter,
        silent: !config.enableConsoleLogs,
        transports: [
          new winston.transports.Console({
            format: consoleFormatterForDevelopers,
          }),
          ...transports,
        ],
      })
    }
  }
  onApplicationShutdown() {
    this.cleanupLogger()
  }

  // Clean up on module destruction
  onModuleDestroy() {
    this.cleanupLogger()
  }

  private async cleanupLogger() {
    if (this.tcpLogger) {
      RawLogger.debug("Cleaning up logger...")
      await this.tcpLogger.flush() // Ensure remaining logs are flushed
      this.tcpLogger = null
    }
  }

  private initTcpLogger(config: LibConfig) {
    if (!this.config.elkRestApi) return
    const yyyyww = getYearAndWeek()
    this.tcpLogger = new ElkBufferedTcpLogger(
      new ElkRestApi({ ...config.elkRestApi, indexName: `${config.env}-${config.serviceName}-event-${yyyyww}` })
    )
    this.tcpLogger.start()
  }

  info(fileName: string, message: string, messageData?: Record<string, any>, context?: ICommonLogContext) {
    LoggerService.logger.info(this.formatMessage(fileName, LogLevel.info, message, messageData, context))
  }

  debug(fileName: string, message: any, messageData?: Record<string, any>, context?: ICommonLogContext) {
    LoggerService.logger.warn(this.formatMessage(fileName, LogLevel.warn, message, messageData, context))
  }

  warn(fileName: string, message: string, messageData?: Record<string, any>, context?: ICommonLogContext) {
    LoggerService.logger.warn(this.formatMessage(fileName, LogLevel.warn, message, messageData, context))
  }

  event(
    fileName: string,
    eventName: string,
    eventCategory: string,
    eventDomain: string,
    eventData: any,
    message?: string,
    context?: ICommonLogContext
  ) {
    const logMessage: LogMessage = {
      filename: fileName,
      system: this.config.serviceName,
      component: this.config.serviceName,
      env: this.envPrefix,
      systemEnv: `${this.envPrefix}-${this.config.serviceName}`,
      logType: LogLevel.event,
      event: {
        name: eventName,
        category: eventCategory,
        domain: eventDomain,
        data: eventData,
      },
      message: message || eventName,
    }
    if (context) {
      logMessage.context = {
        clientTraceId: context.clientTraceId,
        tenant: getTenantMoniker(context.tenantId),
        userId: context.userId,
        requestTraceId: context.requestTraceId,
        transactionName: context.transactionName,
      }
    }
    if (this.config?.elkRestApi?.useForEvents && this.tcpLogger) {
      const timestamp = new Date().toISOString()
      const eventObj = { ...logMessage, "@timestamp": timestamp, timestamp: timestamp }
      const tx = ApmHelper.Instance.getApmAgent().currentTransaction
      if (tx) {
        eventObj["trace.id"] = tx.ids["trace.id"]
        eventObj["transaction.id"] = tx.ids["transaction.id"]
      }
      this.tcpLogger.log(eventObj)
    } else {
      LoggerService.logger.info(logMessage)
    }
  }

  /**
   * Log an Exception or any kind of Error. If you log an Error, it will be parsed into a ServerException.
   * @param error
   * @param contextData For some additional data relevant to the error. This context data will be added to the exceptions context data.
   */
  logError(error: Exception | Error, contextData?: Record<string, any>) {
    const exception = ExceptionUtil.parse(error)
    if (contextData) exception.setContextData(contextData)
    ApmHelper.Instance.captureError(exception)
    const fileName = LoggerService._getCallerFile()
    let exceptionString = exception.toString()
    if (exceptionString.length > 800) {
      // truncate to avoid logs being lost
      exceptionString = `${exceptionString.substring(0, 780)}...(truncated due to UDP limit)`
    }
    const formatedMessage = this.formatMessage(fileName, LogLevel.error, exceptionString)
    LoggerService.logger.error(formatedMessage)
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
    commonFields?: ICommonLogContext
  ): LogMessage {
    const obj: LogMessage = {
      filename: fileName,
      system: this.config.serviceName,
      component: this.config.serviceName,
      env: this.envPrefix,
      systemEnv: `${this.envPrefix}-${this.config.serviceName}`,
      logType: logLevel,
      message: message + (data ? ` ${util.inspect(data, false, 10)}` : ""),
    }
    if (commonFields) {
      obj.context = {
        clientTraceId: commonFields.clientTraceId,
        tenant: getTenantMoniker(commonFields.tenantId),
        userId: commonFields.userId,
        requestTraceId: commonFields.requestTraceId,
        transactionName: commonFields.transactionName,
      }
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
  const yyyyww = `${year}${weekNumber.toString().padStart(2, "0")}`
  return yyyyww
}
