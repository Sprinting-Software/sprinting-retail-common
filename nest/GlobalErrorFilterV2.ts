import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
  HttpException as DefaultHttpException,
  HttpStatus,
} from '@nestjs/common';
import { CommonException } from '../errorHandling/CommonException';
import { ErrorFactoryV2 } from '../errorHandling/ErrorFactoryV2';
import { HttpException } from '../logger/HttpException';
import { LoggerServiceV2 } from '../logger/LoggerServiceV2';

@Injectable()
@Catch()
export class GlobalErrorFilterV2 implements ExceptionFilter {
  constructor(private logger: LoggerServiceV2) {}

  catch(error: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const mappedError: CommonException = ErrorFactoryV2.parseAnyError(error);
    this.logger.logError(mappedError);
    response.status(mappedError.httpStatus ?? HttpStatus.BAD_GATEWAY).send(mappedError.toJson());
  }
}
