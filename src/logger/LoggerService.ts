import { UDPTransport } from "udp-transport-winston"
import * as winston from "winston"
import { ApmHelper } from "../apm/ApmHelper"
const { combine, timestamp } = winston.format
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ecsFormat = require("@elastic/ecs-winston-format")
import { Injectable, Scope } from "@nestjs/common"
import { AppException } from "../errorHandling/AppException"
import { LogContext } from "../common/LogContext"

export const enum LogLevel {
  info = "info",
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
  [key: string]: any
}

export interface ConfigOptions {
  env: string
  serviceName: string
  enableLogs: boolean
  logstash: {
    isUDPEnabled: boolean
    host: string
    port: number
  }
}

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService {
  private readonly logger: winston.Logger

  constructor(private readonly config: ConfigOptions, transports: any[] = []) {
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

  info(fileName: string, message: string) {
    this.logger.info(this.formatMessage(fileName, LogLevel.info, message))
  }

  debug(fileName: string, message: any) {
    this.logger.warn(this.formatMessage(fileName, LogLevel.warn, message))
  }

  warn(fileName: string, message: string) {
    this.logger.warn(this.formatMessage(fileName, LogLevel.warn, message))
  }

  /**
   * logError Overloading with type AppException
   * logError method -> where you have caught an error and only want to log
   * @param appException
   * @param data
   */
  logError(appException: AppException, data?: LogContext): void
  /**
   * logError Overloading with type AppError
   * @param appError
   * @param data
=   */
  logError(appError: Error, data?: Record<string, any>): void
  logError(error: AppException | Error, contextData?: LogContext) {
    ApmHelper.captureError(error, contextData)
    const fileName = LoggerService._getCallerFile()

    this.logger.error(this.formatMessage(fileName, LogLevel.error, error.toString(), contextData))
  }

  formatMessage(fileName: string, logLevel: LogLevel, message: string, data?: Record<string, any>): LogMessage {
    return {
      filename: fileName,
      system: this.config.serviceName,
      component: this.config.serviceName,
      env: this.config.env,
      systemEnv: `${this.config.env}-${this.config.serviceName}`,
      logType: logLevel,
      message: message,
      ...data,
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
