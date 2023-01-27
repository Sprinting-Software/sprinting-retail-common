import { HttpException as DefaultHttpException, HttpStatus } from '@nestjs/common';
const util = require('util');

type IException = {
  statusCode: number;
  name: string;
  data?: Record<string, any>;
  message?: string;
  innerError?: any;
};

export class HttpException extends DefaultHttpException implements IException {
  constructor(
    readonly statusCode: number,
    readonly name: string,
    readonly message: string = 'Internal error',
    readonly data?: Record<string, any>,
    readonly innerError?: any,
  ) {
    super(name, statusCode);
  }
  
  override toString() {
    return (
      this.name +
      ' (http status ' +
      this.statusCode +
      ')' +
      (this.data ? ' - errorData: ' + util.inspect(this.data) : '') +
      (this.message ? ' - ' + this.message : '') +
      (this.innerError ? '\n    |-> innerError: ' + error2string(this.innerError) : '')
    );
  }
  
  toJson(): any {
    return {
      errorName: this.name,
      innerError: error2string(this.innerError),
      errorData: this.data,
      message: this.message,
      httpStatus: this.statusCode,
    };
  }
}

export class InternalServerError extends HttpException {
  constructor(
    name: string,
    message: string,
    data?: Record<string, any>,
    innerError?: any
  ) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, name, message, data, innerError)
  }
}

function error2string(e?: any): string | undefined {
  if (e === undefined) return undefined;
  if (e instanceof HttpException) {
    return e.toString();
  } else if (e as IException) {
    const e2 = e as IException;
    return JSON.stringify({
      httpStatus: e2.statusCode,
      errorName: e2.name,
      errorData: e2.data,
      detailedMessage: e2.message,
      innerError: error2string(e2.innerError),
    });
  } else {
    return '' + e;
  }
}
