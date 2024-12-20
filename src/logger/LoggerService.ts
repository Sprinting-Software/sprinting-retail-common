import { UDPTransport } from "udp-transport-winston"
import * as winston from "winston"
import { ApmHelper } from "../apm/ApmHelper"
import { Injectable, Scope } from "@nestjs/common"
import { Exception } from "../errorHandling/exceptions/Exception"
import { LoggerConfig } from "./LoggerConfig"
import util from "util"
import { ExceptionUtil } from "../errorHandling/ExceptionUtil"
import { ServerException } from "../errorHandling/exceptions/ServerException"
import ecsFormat from "@elastic/ecs-winston-format"

const { timestamp, printf, combine } = winston.format

/**
 * Shared context data for all log records
 */
export interface ICommonLogContext {
  tenantId: number
  clientTraceId?: string
  userId?: string
  requestTraceId?: string
  transactionName?: string
}

export const enum LogLevel {
  info = "info",
  event = "event",
  debug = "debug",
  error = "error",
  warn = "warn",
}

interface LogMessage {
  filename: string
  system: string
  component: string
  env: string
  systemEnv: string
  logType: LogLevel
  message: string
  event?: Record<string, any>
  context?: Omit<ICommonLogContext, "tenantId"> & { tenant: string }
}

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
export class LoggerService {
  private static logger: winston.Logger
  private envDashEnv: string
  private envPrefix: string

  // private readonly logstashClient: Logstash

  constructor(private readonly config: LoggerConfig, transports: any[] = []) {
    const conf = {
      systemName: config.serviceName,
      host: config.logstash.host,
      port: config.logstash.port,
    }
    this.envDashEnv = formatEnvLetterWithDashEnv(config.env)
    this.envPrefix = formatAsEnvLetter(config.env)

    if (config.logstash.isUDPEnabled) {
      transports.push(new UDPTransport(conf))
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
    LoggerService.logger.info(logMessage)
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
