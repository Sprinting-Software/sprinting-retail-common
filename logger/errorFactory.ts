import { HttpStatus } from '@nestjs/common';
import { HttpException } from './errors';

export class ErrorFactory {
   static innerError(name, message: string, data?: Record<string, any>, innerError?: any): HttpException {
    return ErrorFactory.createError(HttpStatus.INTERNAL_SERVER_ERROR, name,  message, data, innerError)
  }
  
  static createError(status: number, name: string, message: string, data?: Record<string, any>, innerError?: any): HttpException {
    return new HttpException(status, name, message, data, innerError)
  }
}
