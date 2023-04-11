import { LogContext } from "../logger/LogContext"
import { AppException } from "../errorHandling/AppException"
import { ApmConfig } from "../config/interface/ApmConfig"
import { ErrorParser } from "../errorHandling/ErrorParser"
import { DEFAULT_APM_CONFIG } from "../config/interface/RetailCommonConfigConvict"

export type IApmSpan = { end: () => void }

export class ApmHelper {
  private static apm
  private static config: ApmConfig

  constructor(private readonly config?: ApmConfig) {
    ApmHelper.config = { ...DEFAULT_APM_CONFIG, ...config }
    ApmHelper.init()
  }

  static getApmAgent() {
    return ApmHelper.getAPMClient()
  }

  static getConfig(): ApmConfig {
    return ApmHelper.config
  }
  static init() {
    const config = { ...ApmHelper.config }
    const enableApm = Boolean(config.enableLogs) === true
    // config2 has secretToken removed
    const config2 = { ...config }
    if (config2.secretToken) config2.secretToken = "********"
    ApmHelper.myConsole(`ApmHelper.init() called with config: ${JSON.stringify(config2)}`)
    if (!enableApm) {
      ApmHelper.myConsole(
        "Transaction data ARE NOT SENT to APM because ENABLE_APM is overridden and set to false in the environment"
      )
      return
    }
    if (ApmHelper.apm) return ApmHelper.apm

    // APM is a little special with respect to how it is imported. For this reason we need to use require() instead of import.
    ApmHelper.apm = require("elastic-apm-node")
    ApmHelper.apm.start(config)
    ApmHelper.myConsole(`Transaction data ARE SENT to APM: ${JSON.stringify(config.serverUrl)}`)
    ApmHelper.myConsole(
      `Transaction data can be found here: https://kibana.sprinting.io/ under APM. Look for the service named ${config.serviceName}.`
    )
  }

  private static myConsole(msg: string) {
    if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log(msg)
    }
  }

  public static captureError(exception0: Error | AppException, logContext?: LogContext, handled = false) {
    if (!ApmHelper.apm) return

    const exception = ErrorParser.parse(exception0)
    const errorLabels: any = {
      errorName: exception.errorName,
      errorTraceId: exception.errorTraceId,
      ...ApmHelper.config?.labels,
    }

    if (logContext?.tenantId) errorLabels.tenantId = `tid${logContext.tenantId}`
    if (logContext?.userId) errorLabels.userId = logContext.userId

    const errorDetails = {
      handled,
      labels: errorLabels,
      captureAttributes: true,
      message: `${exception.errorName} (${exception.errorTraceId})`,
      // For some reason custom data doesn't work in our ELK so we will comment it out.
      custom: { ...exception.contextData, stacktraceFull: exception.toString() },
    }
    ApmHelper.setLabelOnCurrentTransaction("errorTraceId", exception.errorTraceId)
    ApmHelper.apm.captureError(exception, errorDetails)
  }

  static isAppException(exception: Error | AppException): exception is AppException {
    return (exception as AppException).errorName !== undefined
  }

  /**
   * @returns The transaction ID from the current APM transaction. Will be undefined if no such transaction exists.
   */
  static getTraceIds(): any {
    if (!ApmHelper.apm) return
    const ids: any = ApmHelper.apm.currentTransaction?.ids
    if (ids) {
      return {
        transactionId: ids["transaction.id"],
        traceId: ids["trace.id"],
      }
    } else {
      return undefined
    }
  }

  public static logContextObject(fileName: string, msg: any): void {
    if (!ApmHelper.apm) return
    ApmHelper.apm.setCustomContext({ [fileName]: msg })
  }

  /**
   * Sets a label on the current transaction. If no transaction exists, nothing happens.
   * @param field
   * @param value
   */
  public static setLabelOnCurrentTransaction(field: string, value: string) {
    if (!ApmHelper.apm) return
    if (!ApmHelper.apm.currentTransaction) {
      return
    }
    ApmHelper.apm.currentTransaction.setLabel(field, value)
  }

  //change to apmagent
  public static getAPMClient(): any {
    if (!ApmHelper.apm) ApmHelper.init()

    return ApmHelper.apm
  }

  public static startSpan(fileName: string, spanName: string, message?: string): IApmSpan | undefined {
    if (!ApmHelper.apm) return
    if (!ApmHelper.apm.currentTransaction) {
      return
    }
    return ApmHelper.apm.currentTransaction.startSpan(fileName, spanName, "Javascript", undefined, message)
  }

  public static logSpanEvent(fileName: string, eventName: string, eventMessage: any): void {
    if (!ApmHelper.apm) return
    const span = ApmHelper.apm.startSpan(fileName, eventName, eventMessage)
    span?.end()
  }

  public static stopApm(): void {
    if (!ApmHelper.apm) return
    ApmHelper.apm.stop()
  }
}
