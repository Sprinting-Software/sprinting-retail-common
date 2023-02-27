import { HttpException as NestHttpException } from '@nestjs/common';
import util from 'util';

interface IException {
  statusCode: number;
  name: string;
  contextData?: Record<string, any>;
  detailedMessage?: string;
  innerError?: any;
}

export class HttpException extends NestHttpException {
  private readonly customException = true;

  constructor(
    readonly statusCode: number,
    readonly message: any,
    readonly innerError?: any,
    readonly contextData?: Record<string, any>,
    readonly detailedMessage?: string,
  ) {
    super(message, statusCode);
    this.detailedMessage = detailedMessage ?? this.toString();
  }

  public override toString(): string {
    const details = [
      `http status ${this.statusCode}`,
      this.detailedMessage ? `detailedMessage: ${this.detailedMessage}` : '',
      this.contextData ? `errorData: ${util.inspect(this.contextData)}` : '',
      this.innerError ? `innerError: ${this.errorToString(this.innerError)}` : '',
    ]
      .filter((detail) => !!detail)
      .join(' - ');

    return `${this.name} (${details})`;
  }

  public toJson(): any {
    let message = this.innerError?.message ?? this.message;
    if (this.isJsonString(message)) {
      message = JSON.parse(message);
    }

    const response = {
      errorName: this.innerError?.name ?? this.name,
      innerError: this.errorToString(this.innerError),
      errorData: this.contextData,
      message: message,
      detailedMessage: this.detailedMessage,
      statusCode: this.statusCode,
    };

    if (typeof this.message === 'object') {
      return {
        ...response,
        ...this.message,
      };
    }

    return response;
  }

  private errorToString(e?: any): string | undefined {
    if (e instanceof HttpException) {
      return e.toString();
    } else if (e as IException) {
      const e2 = e as IException;
      return JSON.stringify({
        status: e2.statusCode,
        errorName: e2.name,
        errorData: e2.contextData,
        detailedMessage: e2.detailedMessage,
        innerError: this.errorToString(e2.innerError),
      });
    } else {
      return `${e}`;
    }
  }

  private isJsonString(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
}
