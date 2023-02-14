import { HttpException } from './errors';
import { UDPTransport } from 'udp-transport-winston';
import * as winston from 'winston';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ApmHelper } from '../apm/apm.helper';
import { Utils } from './utils';
const { combine, timestamp } = winston.format;
const ecsFormat = require('@elastic/ecs-winston-format');
import { HttpException as DefaultHttpException, Injectable, Scope } from '@nestjs/common';

export const enum LogLevel {
  info = 'info',
  debug = 'debug',
  error = 'error',
  warn = 'warn',
}

export interface ConfigOptions {
  env: string;
  serviceName: string;
  logging: {
    enableLogs: boolean;
    enableAPM: boolean;
  };
  logstash: {
    isUDPEnabled: boolean;
    host: string;
    port: number;
  };
  apm: {
    serviceUrl: string;
    serviceSecret?: string;
  };
}

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService {
  private readonly logger: winston.Logger;
  public readonly apm;

  constructor(private readonly config: ConfigOptions, transports: any[] = []) {
    this.apm = ApmHelper.getAPMClient();
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
      silent: !config.logging.enableLogs,
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
        ...transports,
      ],
    });
  }

  info(filename: string, message: string) {
    this.logger.info({ filename, message });
  }

  debug(filename: string, message: any, data?: any) {
    const logMessage = {
      ...data,
      message,
      ...this.formatMessage(filename, LogLevel.info),
    };

    this.logger.info(logMessage);
  }

  warn(fileName: string, message: string, error?: Error) {
    this.logger.warn({
      ...this.formatMessage(fileName, LogLevel.warn),
      message,
    });
  }

  error(
    fileName: string,
    message: unknown,
    error?: HttpException | DefaultHttpException,
    context?: HttpArgumentsHost,
    data?: any,
  ) {
    const tenantId = Utils.getJwtTokenData(context?.getRequest().headers?.authorization, 'tenantId');
    this.apm.captureError(error, tenantId);

    const logMessage = {
      ...data,
      ...this.formatMessage(fileName, LogLevel.error),
      message: message,
      context: {
        error: JSON.stringify(error),
        body: JSON.stringify(context?.getRequest().body ?? {}),
      },
    };
    this.logger.error(logMessage);
  }

  log(fileName: string, message: string, logLevel: LogLevel = LogLevel.info, error?: Error): void {
    delete error?.stack;

    const logMessage = {
      ...this.formatMessage(fileName, logLevel),
      message: message,
      context: {
        error,
      },
    };

    this.logger.log(logLevel, logMessage);
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
}
