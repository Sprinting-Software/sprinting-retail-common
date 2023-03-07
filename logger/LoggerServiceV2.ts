import { UDPTransport } from "udp-transport-winston"
import * as winston from "winston"
import { ApmHelper } from "../apm/ApmHelper"
const { combine, timestamp } = winston.format
import { Injectable, Scope } from "@nestjs/common"
import { CommonException } from "../errorHandling/CommonException"
import { ConfigOptions, LogLevel } from "./LoggerService"
import { LogContext } from "../common/LogContext"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ecsFormat = require("@elastic/ecs-winston-format")

@Injectable({ scope: Scope.DEFAULT })
export class LoggerServiceV2 {
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

  public info(fileName: string, message: string, data?: any) {
    this.logger.info(this.formatMessage(fileName, LogLevel.info, message, data))
  }

  public debug(fileName: string, message: any, data?: any) {
    this.logger.debug(this.formatMessage(fileName, LogLevel.debug, message, data))
  }

  public warn(fileName: string, message: string, data?: any) {
    this.logger.warn(this.formatMessage(fileName, LogLevel.warn, message, data))
  }

  /**
   * When you want to log an error. You need to use the ErrorFactoryV2 to product the exception object
   */
  public logError(fileName: string, error: CommonException, logContext?: LogContext) {
    ApmHelper.captureErrorV2(error, logContext)
    const logMessage = error.toString()
    this.logger.error(this.formatMessage(fileName, LogLevel.error, logMessage))
  }

  private formatMessage(fileName: string, logLevel: LogLevel = LogLevel.info, message: string, data?: any) {
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
}
