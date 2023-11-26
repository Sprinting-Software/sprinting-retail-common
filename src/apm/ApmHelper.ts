// APM is special and needs early initialization. For this reason we need to instantiate it here and
// treat both the apmAgent and the config as singletons.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const apmAgentSingleton = require("elastic-apm-node")
let isInitialized = false
let apmConfigSingleton: IApmConfig

import { LogContext } from "../logger/LogContext"
import { Exception } from "../errorHandling/exceptions/Exception"
import { IApmConfig } from "../config/interface/IApmConfig"
import { ExceptionUtil } from "../errorHandling/ExceptionUtil"
import { DEFAULT_APM_CONFIG } from "../config/interface/RetailCommonConfigConvict"

export type IApmSpan = { end: () => void }

/**
 * Used to encapsulate the ApmAgent and allow for easy dependency injection.
 */
export class ApmHelper {
  /**
   * Access the ApmHelper singleton instance from here.
   * Until you call ApmHelper.initialize(...), this Instance will be "dead"
   */
  public static readonly Instance = new ApmHelper()

  /**
   * Must be called as the first line of code in the top-most index.ts or main.ts file in the project
   * in order for instrumentation to properly work.
   * @param config0
   */
  public static init(config0?: Partial<IApmConfig>) {
    apmConfigSingleton = { ...DEFAULT_APM_CONFIG(), ...config0 }
    if (!isApmEnabled(apmConfigSingleton)) {
      return
    }
    if (isInitialized) {
      // never init more than once
      emitWarningIfConfigIsChanged(config0)
      return
    }
    logConfigToConsole(apmConfigSingleton)
    // APM is a little special with respect to how it is imported. For this reason we need to use require() instead of import.
    try {
      apmAgentSingleton.start(apmConfigSingleton)
    } catch (err) {
      throw new Error(`Failed to start APM: ${err} having config ${JSON.stringify(apmConfigSingleton)}`)
    }
    myConsole(`Transaction data ARE SENT to APM: ${JSON.stringify(apmConfigSingleton.serverUrl)}`)
    myConsole(
      `Transaction data can be found here: https://kibana.sprinting.io/ under APM. Look for the service named ${apmConfigSingleton.serviceName}.`
    )
    isInitialized = true
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public getConfig() {
    return apmConfigSingleton
  }

  /**
   * Returns the ApmAgent if it was initialized. Otherwise returns undefined.
   */
  public getApmAgent() {
    return apmAgentSingleton
  }

  public captureError(exception0: Error | Exception, logContext?: LogContext, handled = false) {
    if (!isInitialized) return

    const exception = ExceptionUtil.parse(exception0)
    const errorLabels: any = {
      errorName: exception.errorName,
      errorTraceId: exception.errorTraceId,
      ...apmConfigSingleton?.labels,
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
    this.setLabelOnCurrentTransaction("errorTraceId", exception.errorTraceId)
    apmAgentSingleton.captureError(exception, errorDetails)
  }

  public isAppException(exception: Error | Exception): exception is Exception {
    return (exception as Exception).errorName !== undefined
  }

  /**
   * @returns The transaction ID from the current APM transaction. Will be undefined if no such transaction exists.
   */
  public getTraceIds(): any {
    if (!isInitialized) return
    const ids: any = apmAgentSingleton.currentTransaction?.ids
    if (ids) {
      return {
        transactionId: ids["transaction.id"],
        traceId: ids["trace.id"],
      }
    } else {
      return undefined
    }
  }

  public logContextObject(fileName: string, msg: any): void {
    if (!isInitialized) return
    apmAgentSingleton.setCustomContext({ [fileName]: msg })
  }

  /**
   * Sets a label on the current transaction. If no transaction exists, nothing happens.
   * @param field
   * @param value
   */
  public setLabelOnCurrentTransaction(field: string, value: string) {
    if (!isInitialized) return
    if (!apmAgentSingleton.currentTransaction) {
      return
    }
    apmAgentSingleton.currentTransaction.setLabel(field, value)
  }

  /**
   * @deprecated Use getAPMAgent() instead.
   */
  public getAPMClient(): any {
    return this.getApmAgent()
  }

  public startSpan(fileName: string, spanName: string, message?: string): IApmSpan | undefined {
    if (!isInitialized) return
    if (!apmAgentSingleton.currentTransaction) {
      return
    }
    return apmAgentSingleton.currentTransaction.startSpan(fileName, spanName, "Javascript", undefined, message)
  }

  public logSpanEvent(fileName: string, eventName: string, eventMessage: any): void {
    if (!isInitialized) return
    const span = apmAgentSingleton.startSpan(fileName, eventName, eventMessage)
    span?.end()
  }

  public stopApm(): void {
    if (!isInitialized) return
    apmAgentSingleton.stop()
  }

  isInitialized() {
    return isInitialized
  }
}

function myConsole(msg: string) {
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.log(msg)
  }
}

function isApmEnabled(config: IApmConfig) {
  return config.enableLogs === true
}

function emitWarningIfConfigIsChanged(config0: Partial<IApmConfig>) {
  if (!config0) return
  // must have been called before
  // check if config0 has any values different from ApmHelper.config. If it does, console.log a warning
  const changedConfig = {}
  Object.keys(config0).forEach((key) => {
    if (apmConfigSingleton[key] !== config0[key]) {
      changedConfig[key] = `Now: ${config0[key]}, before: ${apmConfigSingleton[key]}`
    }
  })
  if (Object.keys(changedConfig).length > 0) {
    myConsole(
      `WARNING ******: ApmHelper.init() is called twice with config that differs. The second call will not take effect.: ${JSON.stringify(
        changedConfig
      )}`
    )
  }
}

function logConfigToConsole(config: any) {
  const configToBeLogged = { ...config }
  if (configToBeLogged.secretToken) configToBeLogged.secretToken = "********"
  myConsole(`ApmHelper.init() called with config: ${JSON.stringify(configToBeLogged)}`)
}
