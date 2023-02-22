import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
  HttpException as DefaultHttpException,
} from '@nestjs/common';
import { ErrorFactory } from '../logger/ErrorFactory';
import { HttpException } from '../logger/HttpException';
import { LoggerService } from '../logger/LoggerService';

@Injectable()
@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {}

  catch(error: HttpException | DefaultHttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (error.hasOwnProperty('customException')) {
      const exception = <HttpException>error;
      this.logger.logError(exception);

      response.status(error.getStatus() ?? 500).send(exception.toJson());
    } else if (error.hasOwnProperty('status') && error.getStatus() < 500) {
      const httpException = ErrorFactory.createError(error);
      this.logger.logError(httpException);

      response.status(error.getStatus() ?? 500).send(httpException.toJson());
    } else {
      const unknownError = ErrorFactory.createError(error.name, {}, 'Unknown error');
      this.logger.logError(unknownError, { response: ctx.getResponse() });
      response.status(500).send({
        message: 'Unknown error',
      });
    }
  }
}
