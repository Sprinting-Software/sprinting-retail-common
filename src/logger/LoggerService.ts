import { IEventLogContext, LogLevel, LogMessage } from "./types"

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
}
