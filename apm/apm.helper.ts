import { ConfigOptions } from "../logger/logger.service";

export type IApmSpan = { end: () => void };

export class ApmHelper {
  private readonly apm = require("elastic-apm-node");

  constructor(private readonly config: ConfigOptions) {
    if (!(config.logging.enableAPM === false)) {
      ApmHelper.myConsole(
        "Transaction data ARE NOT SENT to APM because ENABLE_APM is overridden and set to false in the environment"
      );
      return;
    }

    const devConfig = {
      serviceName: config.serviceName,
      centralConfig: false,
      captureExceptions: false,
      metricsInterval: 0,
      serverUrl: config.apm.serviceUrl,
      secretToken: config.apm.serviceSecret,
    };

    this.apm.start(devConfig);
    ApmHelper.myConsole(`Transaction data ARE SENT to APM: ${JSON.stringify(config.apm.serviceUrl)}`);
    ApmHelper.myConsole(
      `Transaction data can be found here: https://kibana.io/ under APM. Look for the service named ${config.serviceName}.`
    );
  }

  private static myConsole(msg: string) {
    if (process.env.NODE_ENV !== "test") {
      console.log(__filename, msg);
    }
  }

  public captureError(exception: Error, tenantId?: string) {
    if (!this.apm) return;
    this.apm.captureError(
      { exception },
      {
        handled: false,
        labels: { errorName: exception.name, tenantId },
        custom: {
          errorName: exception.name,
          errorString: exception.toString(),
          message: exception.message,
        },
      }
    );
  }

  public logContextObject(fileName: string, msg: any): void {
    if (!this.apm) return;
    this.apm.setCustomContext({ [fileName]: msg });
  }

  public startSpan(fileName: string, spanName: string, message?: string): IApmSpan | undefined {
    if (!this.apm) return;
    if (!this.apm.currentTransaction) {
      return;
    }
    return this.apm.currentTransaction.startSpan(fileName, spanName, "Javascript", undefined, message);
  }

  public logSpanEvent(fileName: string, eventName: string, eventMessage: any): void {
    if (!this.apm) return;
    const span = this.startSpan(fileName, eventName, eventMessage);
    span?.end();
  }
}
