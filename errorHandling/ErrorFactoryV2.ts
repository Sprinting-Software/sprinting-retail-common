import { HttpStatus } from '@nestjs/common';
import util from 'util';
import { CommonException } from './CommonException';

/**
 * A factory class to product exception objects
 */
export class ErrorFactoryV2 {
  /**
   * A named error has a name and is intended to be either caught and
   * handled somewhere else in the code - other than global error handlers.
   *
   */
  static createNamedException(
    errorName: string,
    description?: string,
    contextData?: Record<string, any>,
    innerError?: Error | string,
  ): CommonException {
    return new CommonException(HttpStatus.BAD_REQUEST, errorName, contextData, description, innerError);
  }

  /*
createNamedException
createRuntimeException
createHttpException
  */

  static createFromInnerError(innerError: Error | string) {}

  static createUnnamedException(
    description?: string,
    contextData?: Record<string, any>,
    innerError?: Error | string,
  ): CommonException {
    const TECHNICAL_ERROR = 'TechnicalError';
    return new CommonException(HttpStatus.BAD_REQUEST, TECHNICAL_ERROR, contextData, description, innerError);
  }

  static createHttpException(
    httpStatus: HttpStatus,
    description?: string,
    contextData?: Record<string, any>,
    innerError?: Error | string,
  ): CommonException {
    const httpStatusName = HttpStatus[httpStatus];
    const UNKNOWN_HTTP_ERROR = 'UKNOWN HTTP ERROR';
    return new CommonException(httpStatus, httpStatusName ?? UNKNOWN_HTTP_ERROR, contextData, description, innerError);
  }

  /**
   * When you are dealing with an error of an unknown kind, you can parse it to get a proper error object back.
   * @param e Any kind of object
   * @returns
   */
  static parseAnyError(e: any): CommonException {
    if (e instanceof CommonException) return e;
    else if (e instanceof Error) return this.createUnnamedException().setInnerError(e);
    else if (typeof e == 'string')
      return this.createUnnamedException(undefined, undefined, 'An error of type string was thrown: ' + e);
    else
      return this.createUnnamedException(
        undefined,
        undefined,
        'An error of unknown kind was thrown: ' + util.inspect(e),
      );
  }
}

export function error2string(e?: any): string | undefined {
  if (e === undefined) return undefined;
  if (e instanceof CommonException) {
    return e.toString();
  } else if (e instanceof CommonException) {
    const e2 = e as CommonException;
    return JSON.stringify({
      httpStatus: e2.httpStatus,
      errorName: e2.errorName,
      errorData: e2.contextData,
      description: e2.description,
      innerError: error2string(e2.innerError),
    });
  } else {
    return '' + e;
  }
}
