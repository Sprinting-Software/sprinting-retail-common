export type IApmSpan = { end: () => void };

export class ApmHelper {
  private static apm;

  constructor() {
    ApmHelper.init();
  }

  static init() {
    const enableApmEnv = !(process.env.ENABLE_LOGS === 'false');
    if (!enableApmEnv) {
      ApmHelper.myConsole(
        'Transaction data ARE NOT SENT to APM because ENABLE_APM is overridden and set to false in the environment',
      );
      return;
    }
    if (ApmHelper.apm) return ApmHelper.apm;

    ApmHelper.apm = require('elastic-apm-node');
    const devConfig = {
      serviceName: 'loyaltyBE',
      centralConfig: false,
      captureExceptions: false,
      metricsInterval: 0,
      serverUrl: process.env.ELK_SERVICE_URL,
      secretToken: process.env.ELK_SERVICE_SECRET,
    };

    ApmHelper.apm.start(devConfig);
    ApmHelper.myConsole(`Transaction data ARE SENT to APM: ${JSON.stringify(process.env.ELK_SERVICE_URL)}`);
    ApmHelper.myConsole(
      `Transaction data can be found here: https://kibana.sprinting.io/ under APM. Look for the service named ${process.env.SERVICE_NAME}.`,
    );
  }

  private static myConsole(msg: string) {
    if (process.env.NODE_ENV !== 'test') {
      console.log(__filename, msg);
    }
  }

  public static captureError(exception: Error, tenantId?: string) {
    if (!ApmHelper.apm) ApmHelper.init();
    ApmHelper.apm.captureError(exception, {
      handled: false,
      labels: { errorName: exception.name, tenantId },
      custom: {
        errorName: exception.name,
        errorString: exception.toString(),
        message: exception.message,
      },
    });
  }

  public logContextObject(fileName: string, msg: any): void {
    if (!ApmHelper.apm) return;
    ApmHelper.apm.setCustomContext({ [fileName]: msg });
  }

  public setLabel(field: string, value: string) {
    if (!ApmHelper.apm) return;
    if (!ApmHelper.apm.currentTransaction) {
      return;
    }

    ApmHelper.apm.currentTransaction.setLabel(field, value);
  }

  public static getAPMClient(): any {
    if (!ApmHelper.apm) ApmHelper.init();

    return ApmHelper.apm;
  }

  public static startSpan(fileName: string, spanName: string, message?: string): IApmSpan | undefined {
    if (!ApmHelper.apm) return;
    if (!ApmHelper.apm.currentTransaction) {
      return;
    }
    return ApmHelper.apm.currentTransaction.startSpan(fileName, spanName, 'Javascript', undefined, message);
  }

  public static logSpanEvent(fileName: string, eventName: string, eventMessage: any): void {
    if (!ApmHelper.apm) return;
    const span = ApmHelper.apm.startSpan(fileName, eventName, eventMessage);
    span?.end();
  }
}
