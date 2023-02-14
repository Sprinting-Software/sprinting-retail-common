import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
  HttpException as DefaultHttpException,
} from '@nestjs/common';
import { ErrorFactory } from '../logger/error-factory';
import { HttpException } from '../logger/errors';
import { LoggerService } from '../logger/logger.service';

@Injectable()
@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {}

  catch(error: DefaultHttpException | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (error.hasOwnProperty('customException')) {
      const e = <HttpException>error;
      this.logger.error(
        __filename,
        `Caught ${e.name}: ${ErrorFactory.formatError(e)}, response: ${JSON.stringify(e)}`,
        e,
        ctx,
      );

      response.status(e.statusCode ?? 500).send(e.contextData);
    } else if (error.hasOwnProperty('status') && error.getStatus() < 500) {
      const exception = ErrorFactory.createError(error.getStatus(), error.name, error.message, error.cause);
      this.logger.error(
        __filename,
        `Caught exception ${exception.name}: ${exception.name}, response: ${JSON.stringify(exception)}`,
        exception,
        ctx,
      );

      response.status(exception.getStatus() ?? 500).send(error.getResponse());
    } else {
      const unknownError = ErrorFactory.innerError(error.name, error.message);
      this.logger.error(__filename, `Caught Error: ${unknownError.name} `, unknownError, ctx);
      response.status(500).send({
        message: 'Unknown error',
      });
    }
  }
}
