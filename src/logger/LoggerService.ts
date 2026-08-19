import { IEventLogContext, LogLevel, LogMessage } from "./types"
import { HttpPayloadDirection } from "../config/interface/LibConfig"

export type HttpPayloadLogParams = {
  direction: HttpPayloadDirection
  verb: string
  domain: string
  path: string
  statusCode?: number
  requestBody?: any
  responseBody?: any
}

export abstract class LoggerService {
  abstract info(fileName: string, message: string, messageData?: Record<string, any>): void
  abstract debug(fileName: string, message: any, messageData?: Record<string, any>): void
  abstract warn(fileName: string, message: string, messageData?: Record<string, any>): void
  abstract log(message: any, context?: string): void
  abstract error(message: any, context?: string): void
  abstract verbose(message: any, context?: string): void
  abstract event(
    fileName: string,
    eventName: string,
    eventCategory: string,
    eventDomain: string,
    eventData: any,
    message?: string,
    eventContext?: IEventLogContext,
    customData?: Record<string, any>
  ): void
  abstract logError(error: unknown, contextData?: Record<string, any>): void
  abstract logException(
    errorName: string,
    description?: string,
    contextData?: Record<string, any>,
    innerError?: Error
  ): void
  abstract formatMessage(
    fileName: string,
    logLevel: LogLevel,
    message: string,
    data?: Record<string, any>,
    context?: Record<string, any>,
    isEvent?: boolean
  ): LogMessage

  /**
   * Logs an HTTP request/response payload, subject to the configured sampling rules.
   * No-op by default so existing LoggerService implementations don't need to change;
   * only ElkV9LoggerService currently implements this.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  httpPayload(params: HttpPayloadLogParams): void {
    // Intentionally empty default implementation.
  }
}
