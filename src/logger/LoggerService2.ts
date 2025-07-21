import { LoggerService } from "./LoggerService"
import { IEventLogContext } from "./types"
import { LoggerHelper } from "./LoggerHelper"
import { Injectable } from "@nestjs/common"
import { StringUtils } from "../helpers/StringUtils"

/**
 *
 */
@Injectable()
export class LoggerService2 {
  /**
   * Creates an instance of LoggerServiceV2.
   * @param contextProvider An object that provides the current logging context.
   */
  constructor(private readonly logger: LoggerService) {}

  info(fileName: string, message: string, messageData?: Record<string, any>) {
    this.logger.info(fileName, message, messageData)
  }

  debug(fileName: string, message: any, messageData?: Record<string, any>) {
    this.logger.debug(fileName, message, messageData)
  }

  warn(fileName: string, message: string, messageData?: Record<string, any>) {
    this.logger.warn(fileName, message, messageData)
  }

  /**
   * Logs an event to ELK.
   * @param fileName Always pass __filename here. It will be used to identify the source file of the log message.
   * @param eventName This expresses what the event is about. It becomes a separate field in the log record.
   * @param eventDomain This separates events in different domains. It becomes a separate field in the log record.
   * @param eventContext This data will be added as individual fields in the log record. It will be free-text searchable in ELK.
   * @param eventData This data will be serialized to JSON and logged in a single field named "json". It will be free-text searchable in ELK.
   */
  event(fileName: string, eventName: string, eventDomain: string, eventContext: IEventLogContext, eventData: any) {
    const message = LoggerHelper.myconcatEssentialData(
      `EVENT: ${eventDomain ? `${eventDomain} / ` : ""}${eventName}`,
      eventContext
    )
    this.logger.event(
      fileName,
      eventName,
      undefined,
      eventDomain,
      {
        json: StringUtils.stringifySafeWithFallback(eventData, 4),
      },
      message,
      eventContext
    )
  }

  logError(error: Error | unknown, contextData?: Record<string, any>) {
    this.logger.logError(error, contextData)
  }

  logException(errorName: string, description?: string, contextData: Record<string, any> = {}, innerError?: Error) {
    this.logger.logException(errorName, description, contextData, innerError)
  }
}
