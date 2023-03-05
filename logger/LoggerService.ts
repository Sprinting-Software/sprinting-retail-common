import { HttpException } from './HttpException';
import { UDPTransport } from 'udp-transport-winston';
import * as winston from 'winston';
import { ApmHelper } from '../apm/ApmHelper';
const { combine, timestamp } = winston.format;
const ecsFormat = require('@elastic/ecs-winston-format');
import { Injectable, Scope } from '@nestjs/common';

export const enum LogLevel {
  info = 'info',
  debug = 'debug',
  error = 'error',
  warn = 'warn',
}

export interface ConfigOptions {
  env: string;
  serviceName: string;
  enableLogs: boolean;
  logstash: {
    isUDPEnabled: boolean;
    host: string;
    port: number;
  };
}

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService {
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

  info(filename: string, message: string) {
    this.logger.info({
      message: message,
      logType: LogLevel.info,
      ...this.formatMessage(filename),
    });
  }

  debug(filename: string, message: any, data?: any) {
    const logMessage = {
      ...data,
      message,
      ...this.formatMessage(filename),
    };

    this.logger.debug(logMessage);
  }

  warn(fileName: string, message: string) {
    this.logger.warn({
      ...this.formatMessage(fileName, LogLevel.warn),
      message,
    });
  }

  /**
   * logError Overloading with type Error
   * logError method -> where you have caught an error and only want to log
   * @param innerError
   * @param data
   * @param detailedMessage
   */
  logError(innerError: HttpException, data?: Record<string, any>, detailedMessage?: string): void;
  /**
   * logError Overloading by name
   * where you have not caught an error, but you have a business error, and you want to log it but not throw it
   * @param name
   * @param data
   * @param detailedMessage
   */
  logError(name: string, data?: Record<any, any>, detailedMessage?: string): void;
  logError(innerError: string | Error, data?: Record<string, any>, detailedMessage?: string) {
    let error: HttpException;
    if (typeof innerError === 'string') {
      error = new HttpException(500, innerError, detailedMessage, data);
    } else {
      error = <HttpException>innerError;
    }

    ApmHelper.captureError(error);
    const logMessage = {
      ...data,
      ...this.formatMessage(LoggerService._getCallerFile(), LogLevel.error),
      message: error.message,
      context: {
        error: JSON.stringify(error),
      },
    };
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
