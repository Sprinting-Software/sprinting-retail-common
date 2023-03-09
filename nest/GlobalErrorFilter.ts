import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
  HttpException as DefaultHttpException,
} from "@nestjs/common"
import { ErrorFactory } from "../logger/ErrorFactory"
import { HttpException } from "../logger/HttpException"
import { LoggerService } from "../logger/LoggerService"

@Injectable()
@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(error: HttpException | DefaultHttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    if (Object.prototype.hasOwnProperty.call(error, "customException")) {
      const exception = <HttpException>error
      this.logger.logError(exception)

      response.status(error.getStatus() ?? 500).send(exception.toJson())
    } else if (Object.prototype.hasOwnProperty.call(error, "status") && typeof error.getStatus === "function") {
      const httpException = ErrorFactory.createError(error)
      this.logger.logError(httpException)

      response.status(error.getStatus() ?? 500).send(httpException.toJson())
    } else {
      const unknownError = ErrorFactory.createError(error.name, 500, {}, error.message)
      this.logger.logError(unknownError)
      response.status(500).send({
        message: "Unknown error",
      })
    }
  }
}
