export type IApmSpan = { end: () => void }
import { LogContext } from "../common/LogContext"
import { CommonException } from "../errorHandling/CommonException"

export interface ApmConfig {
  enableLogs: boolean
  serviceName: string
  serverUrl: string
  secretToken?: string
  apmSamplingRate?: number
  labels?: Record<string, string>
}

export class ApmHelper {
  private static apm
  private static config

  constructor(private readonly config?: ApmConfig) {
    ApmHelper.config = config
    ApmHelper.init()
  }

  static getApmAgent() {
    return ApmHelper.getAPMClient()
  }

  static getConfig(): ApmConfig {
    if (ApmHelper.config !== undefined) {
      return ApmHelper.config
    }

    return {
      enableLogs: Boolean(process.env.ENABLE_LOGS === "true"),
      serverUrl: process.env.ELK_SERVICE_URL,
      secretToken: process.env.ELK_SERVICE_SECRET,
      serviceName: process.env.ELK_SERVICE_NAME,
      apmSamplingRate: Number(process.env.ELK_APM_SAMPLINGRATE),
    }
  }
  static init() {
    const config = ApmHelper.getConfig()
    const enableApm = Boolean(config.enableLogs) === true
    if (!enableApm) {
      ApmHelper.myConsole(
        "Transaction data ARE NOT SENT to APM because ENABLE_APM is overridden and set to false in the environment"
      )
      return
    }
    if (ApmHelper.apm) return ApmHelper.apm

    ApmHelper.apm = require("elastic-apm-node")
    const devConfig = {
      serviceName: config.serviceName,
      centralConfig: false,
      captureExceptions: false,
      metricsInterval: 0,
      transactionSampleRate: config.apmSamplingRate,
      serverUrl: config.serverUrl,
      secretToken: config.secretToken,
    }

    ApmHelper.apm.start(devConfig)
    ApmHelper.myConsole(`Transaction data ARE SENT to APM: ${JSON.stringify(devConfig.serverUrl)}`)
    ApmHelper.myConsole(
      `Transaction data can be found here: https://kibana.sprinting.io/ under APM. Look for the service named ${devConfig.serviceName}.`
    )
  }

  private static myConsole(msg: string) {
    if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log(__filename, msg)
    }
  }

  public static captureError(exception: Error, tenantId?: string) {
    if (!ApmHelper.apm) return
    ApmHelper.apm.captureError(exception, {
      handled: false,
      labels: { errorName: exception.name, tenantId },
      message: exception.message.toString(),
      custom: {
        errorName: exception.name,
        errorString: exception.toString(),
      },
    })
  }

  public static captureErrorV2(exception: CommonException, logContext: LogContext, handled?: boolean) {
    if (!ApmHelper.apm) return
    const tenantId = logContext?.tenantContext?.tenantId
    const userId = logContext?.userIdContext?.userId
    const myLabels = {
      errorName: exception.errorName,
      errorDescription: exception.description,
      ...ApmHelper.config.labels,
    }
    if (tenantId) myLabels.tenant = `tid${tenantId}`
    if (userId) myLabels.userId = userId

    ApmHelper.apm.captureError(exception, {
      handled: handled,
      labels: myLabels,
      captureAttributes: false,
      custom: { ...exception.contextData },
      message: exception.toPrintFriendlyString(),
      "user.id": userId,
    })
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

  public static setLabel(field: string, value: string) {
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
