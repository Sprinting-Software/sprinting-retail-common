import { UDPTransport } from "udp-transport-winston"
import * as winston from "winston"
import { ApmHelper } from "../apm/ApmHelper"
import { Injectable, Scope } from "@nestjs/common"
import { AppException } from "../errorHandling/exceptions/AppException"
import { LogContext } from "./LogContext"
import { LoggerConfig } from "./LoggerConfig"
import util from "util"
import { ErrorParser } from "../errorHandling/ErrorParser"

const { combine, timestamp } = winston.format
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ecsFormat = require("@elastic/ecs-winston-format")

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
  event: Record<string, any>
}

export type ConfigOptions = LoggerConfig

interface CustomEventLog {
  eventName: string
  eventCategory?: string
  eventData: any
}

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService {
  private readonly logger: winston.Logger
  // private readonly logstashClient: Logstash

  constructor(private readonly config: LoggerConfig, transports: any[] = []) {
    const conf = {
      systemName: config.serviceName,
      host: config.logstash.host,
      port: config.logstash.port,
    }

    if (config.logstash.isUDPEnabled) {
      transports.push(new UDPTransport(conf))
    }

    this.logger = winston.createLogger({
      format: combine(timestamp(), ecsFormat({ convertReqRes: true, apmIntegration: true })),
      silent: !config.enableLogs,
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
        ...transports,
      ],
    })
  }

  info(fileName: string, message: string, contextData?: Record<string, any>) {
    this.logger.info(this.formatMessage(fileName, LogLevel.info, message, contextData))
  }

  debug(fileName: string, message: any, contextData?: Record<string, any>) {
    this.logger.warn(this.formatMessage(fileName, LogLevel.warn, message, contextData))
  }

  warn(fileName: string, message: string, contextData?: Record<string, any>) {
    this.logger.warn(this.formatMessage(fileName, LogLevel.warn, message, contextData))
  }

  event(fileName: string, eventName: string, eventData: any, eventCategory?: string) {
    this.logger.info(
      this.formatMessage(
        fileName,
        LogLevel.event,
        this.eventToString({ eventName, eventData, eventCategory }),
        undefined,
        eventData
      )
    )
  }

  private eventToString(event: CustomEventLog) {
    return `EVENT ${event.eventName} ${event.eventCategory ? ` (${event.eventCategory})` : ""} ${util.inspect(
      event.eventData,
      false,
      10
    )}`
  }

  /**
   * Log an AppException or any kind of Error. If you log an Error, it will be parsed to an AppException.
   * @param error
   * @param contextData For some additional data relevant to the error
   */
  logError(error: AppException | Error, contextData?: Record<string, any>) {
    const exception = ErrorParser.parse(error)
    if (contextData) exception.setContextData(contextData)
    ApmHelper.captureError(exception)
    const fileName = LoggerService._getCallerFile()
    this.logger.error(this.formatMessage(fileName, LogLevel.error, exception.toString()))
  }

  formatMessage(
    fileName: string,
    logLevel: LogLevel,
    message: string,
    data?: Record<string, any>,
    eventData?: Record<string, any>
  ): LogMessage {
    return {
      filename: fileName,
      system: this.config.serviceName,
      component: this.config.serviceName,
      env: this.config.env,
      systemEnv: `${this.config.env}-${this.config.serviceName}`,
      logType: logLevel,
      message: message + (data ? ` ${util.inspect(data, false, 10)}` : ""),
      event: eventData,
    }
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
