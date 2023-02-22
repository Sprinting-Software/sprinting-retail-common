import { HttpException as DefaultHttpException } from '@nestjs/common';
const util = require('util');

type IException = {
  statusCode: number;
  name: string;
  contextData?: Record<string, any>;
  detailedMessage?: string;
  innerError?: any;
};

export class HttpException extends DefaultHttpException {
  private customException = true;

  constructor(
    readonly statusCode: number,
    readonly name: string,
    readonly innerError?: any,
    readonly contextData?: Record<string, any>,
    readonly detailedMessage?: string,
  ) {
    super(name, statusCode);
    this.message = this.toString();
  }

  override toString() {
    return (
      this.name +
        ' (http status ' +
        this.statusCode +
        ')' +
        (this.contextData ? ' - errorData: ' + util.inspect(this.contextData) : '') +
        this.detailedMessage ??
      '' + (this.innerError ? '\n    |-> innerError: ' + this.error2string(this.innerError) : '')
    );
  }

  toJson(): any {
    return {
      errorName: this.name,
      innerError: this.error2string(this.innerError),
      errorData: this.contextData,
      message: this.message,
      status: this.statusCode,
    };
  }

  private error2string(e?: any): string | undefined {
    if (e === undefined) return undefined;
    if (e instanceof HttpException) {
      return e.toString();
    } else if (e as IException) {
      const e2 = e as IException;
      return JSON.stringify({
        status: e2.statusCode,
        errorName: e2.name,
        errorData: e2.contextData,
        detailedMessage: e2.detailedMessage,
        innerError: this.error2string(e2.innerError),
      });
    } else {
      return '' + e;
    }
  }
}
