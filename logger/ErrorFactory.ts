import { HttpException as DefaultHttpException } from '@nestjs/common';
import { HttpException } from './HttpException';

export class ErrorFactory {
  /**
   * where you have not caught an error, but you have a business error, and want to throw it as a new error
   * @param name
   * @param status
   * @param contextData
   * @param detailedMessage
   */
  static createError(
    name: string,
    status?: number,
    contextData?: Record<string, any>,
    detailedMessage?: string,
  ): HttpException;
  /**
   *  where you have caught an error and want to throw a new error
   * @param innerError
   * @param status
   * @param contextData
   * @param detailedMessage
   */
  static createError(
    innerError: Error | DefaultHttpException,
    status?: number,
    contextData?: Record<string, any>,
    detailedMessage?: string,
  ): HttpException;

  static createError(
    error: string | Error | DefaultHttpException,
    status?: number,
    contextData?: Record<string, any>,
    detailedMessage?: string,
  ): HttpException {
    if (typeof error === 'string')
      return new HttpException(
        status ?? 400,
        error,
        { name: error, message: detailedMessage },
        contextData,
        detailedMessage,
      );
    if (error.name === 'BadRequestException') {
      const exception = <DefaultHttpException>error;
      return new HttpException(
        exception.getStatus(),
        exception.getResponse(),
        { name: exception.name },
        contextData,
        exception.message,
      );
    }
    if (error.hasOwnProperty('status')) {
      const exception = <DefaultHttpException>error;
      return new HttpException(exception.getStatus(), exception.message, exception, contextData, exception.message);
    }

    return new HttpException(status ?? 400, error.name, error, contextData, detailedMessage);
  }

  static formatError(error: HttpException): string {
    return `name: ${error.name}, errorData: ${JSON.stringify(error.contextData)}`;
  }
}
