import { HttpException as DefaultDefaultHttpException } from '@nestjs/common';
import { HttpException } from './HttpException';

export class ErrorFactory {
  /**
   * where you have not caught an error, but you have a business error, and want to throw it as a new error
   * @param name
   * @param contextData
   * @param detailedMessage
   */
  static createError(name: string, contextData?: Record<string, any>, detailedMessage?: string): HttpException;
  /**
   *  where you have caught an error and want to throw a new error
   * @param innerError
   * @param contextData
   * @param detailedMessage
   */
  static createError(
    innerError: Error | DefaultDefaultHttpException,
    contextData?: Record<string, any>,
    detailedMessage?: string,
  ): HttpException;

  static createError(
    error: string | Error | DefaultDefaultHttpException,
    contextData?: Record<string, any>,
    detailedMessage?: string,
  ): HttpException {
    if (typeof error === 'string') return new HttpException(400, error, detailedMessage, contextData);
    if (error.hasOwnProperty('status')) {
      const exception = <DefaultDefaultHttpException>error;
      return new HttpException(
        exception.getStatus(),
        exception.name,
        exception,
        contextData,
        detailedMessage ?? exception.message,
      );
    }

    return new HttpException(400, error.name, error, contextData, detailedMessage);
  }

  static formatError(error: HttpException): string {
    return `name: ${error.name}, errorData: ${JSON.stringify(error.contextData)}`;
  }
}
