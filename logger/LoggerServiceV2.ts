import { UDPTransport } from 'udp-transport-winston';
import * as winston from 'winston';
import { ApmHelper } from '../apm/ApmHelper';
const { combine, timestamp } = winston.format;
const ecsFormat = require('@elastic/ecs-winston-format');
import { Injectable, Scope } from '@nestjs/common';
import { CommonException } from '../errorHandling/CommonException';
import { ConfigOptions, LogLevel } from './LoggerService';
import { LogContext } from '../common/LogContext';

@Injectable({ scope: Scope.DEFAULT })
export class LoggerServiceV2 {
  private readonly logger: winston.Logger;

  constructor(private readonly config: ConfigOptions, transports: any[] = []) {
    const conf = {
      systemName: config.serviceName,
      host: config.logstash.host,
      port: config.logstash.port,
    };

    if (config.logstash.isUDPEnabled) {
      transports.push(new UDPTransport(conf));
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
    });
  }

  public info(filename: string, message: string) {
    this.logger.info({
      message: message,
      logType: LogLevel.info,
      ...this.formatMessage(filename),
    });
  }

  public debug(filename: string, message: any, data?: any) {
    const logMessage = {
      ...data,
      message,
      ...this.formatMessage(filename),
    };

    this.logger.debug(logMessage);
  }

  public warn(fileName: string, message: string) {
    this.logger.warn({
      ...this.formatMessage(fileName, LogLevel.warn),
      message,
    });
  }

  /**
   * When you want to log an error. You need to use the ErrorFactoryV2 to product the exception object
   * @param error
   */
  public logError(error: CommonException, logContext?: LogContext) {
    ApmHelper.captureErrorV2(error, logContext);
    const logMessage = error.toString();
    this.logger.error(logMessage);
  }

  private formatMessage(fileName: string, logLevel: LogLevel = LogLevel.info) {
    return {
      filename: fileName,
      system: this.config.serviceName,
      component: this.config.serviceName,
      env: this.config.env,
      systemEnv: this.config.env + '-' + this.config.serviceName,
      logType: logLevel,
    };
  }

  /*
    This method for getting file caller info, it should be used when someone directly calls logError method
   */
  private static _getCallerFile(error?: Error) {
    const _pst = Error.prepareStackTrace;
    const stackTraceLimit = Error.stackTraceLimit;

    Error.prepareStackTrace = function (err, stack) {
      return stack;
    };
    Error.stackTraceLimit = 3;

    let err = error;
    if (error === undefined) err = new Error();
    const stack = err.stack;
    Error.prepareStackTrace = _pst;
    Error.stackTraceLimit = stackTraceLimit;

    // @ts-ignore
    return stack[2].getFileName();
  }
}
