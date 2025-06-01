import { LoggerService } from "./LoggerService"
import { ICommonLogContext, IEventLogContext } from "./types"
import { LoggerHelper } from "./LoggerHelper"
import { ApplicationAsyncContext } from "../localasynccontext/ApplicationAsyncContext"
import { Injectable } from "@nestjs/common"

/**
 *
 */
@Injectable()
export class LoggerServiceV2 {
  /**
   * Creates an instance of LoggerServiceV2.
   * @param contextProvider An object that provides the current logging context.
   */
  constructor(private readonly contextProvider: ApplicationAsyncContext, private readonly logger: LoggerService) {}

  info(fileName: string, message: string, messageData?: Record<string, any>) {
    this.logger.info(fileName, message, messageData, this.getCommonLogContext())
  }

  debug(fileName: string, message: any, messageData?: Record<string, any>) {
    this.logger.debug(fileName, message, messageData, this.getCommonLogContext())
  }

  warn(fileName: string, message: string, messageData?: Record<string, any>) {
    this.logger.warn(fileName, message, messageData, this.getCommonLogContext())
  }

  event(fileName: string, eventName: string, eventDomain: string, eventContext: IEventLogContext, eventData: any) {
    const commonContext = this.getCommonLogContext()

    const message = LoggerHelper.myconcatEssentialData(
      `EVENT: ${eventDomain ? `${eventDomain} / ` : ""}${eventName}`,
      eventContext
    )

    this.logger.event(
      fileName,
      eventName,
      undefined,
      eventDomain,
      { json: JSON.stringify(eventData, undefined, 4) },
      message,
      commonContext,
      eventContext
    )
  }

  private getCommonLogContext(): ICommonLogContext {
    return this.contextProvider.getContext<ICommonLogContext>()
  }

  logError(error: Error | unknown, contextData?: Record<string, any>) {
    this.logger.logError(error, contextData)
  }

  logException(errorName: string, description?: string, contextData: Record<string, any> = {}, innerError?: Error) {
    this.logger.logException(errorName, description, contextData, innerError)
  }
}
