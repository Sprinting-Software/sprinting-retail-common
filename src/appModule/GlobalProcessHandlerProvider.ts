import { Injectable } from "@nestjs/common"
import { LoggerService } from "../logger/LoggerService"

@Injectable()
export class GlobalProcessHandlerProvider {
  constructor(loggerService: LoggerService) {
    GlobalProcessHandlerProvider.setupGlobalProcessHandlersWithLogger(loggerService)
  }

  public static setupGlobalProcessHandlersWithLogger(logger: LoggerService) {
    if (process.listenerCount("unhandledRejection") > 0) {
      try {
        logger.warn(
          "CommonAppModule",
          "There is already an 'unhandledRejection' handler, not adding sprinting-retail-common one."
        )
      } catch (err) {
        //Suppress errors in error handling
        // eslint-disable-next-line no-console
        console.log("There is already an 'unhandledRejection' handler, not adding sprinting-retail-common one.")
      }
    } else {
      process
        .on("unhandledRejection", (reason) => {
          const msg = "A Promise rejection was not handled."
          // eslint-disable-next-line no-console
          console.log("UnhandledRejectionError", msg, reason)
          try {
            logger.logException("UnhandledRejectionError", msg, undefined, <Error>reason)
          } catch (err) {
            // eslint-disable-next-line no-console
            console.log("Error while trying to report an UnhandledRejectionError", err)
          }
        })
        .on("uncaughtException", (reason) => {
          const msg = "An exception was not caught properly."
          // eslint-disable-next-line no-console
          console.log("UncaughtException", msg, reason)
          try {
            logger.logException("UncaughtException", msg, undefined, <Error>reason)
          } catch (err) {
            // eslint-disable-next-line no-console
            console.log("Error while trying to report an UncaughtException", err)
          }
        })
    }
  }
}
