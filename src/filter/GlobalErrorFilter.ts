import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter, Injectable } from "@nestjs/common"
import { LoggerService } from "../logger/LoggerService"
import { AppException } from "../errorHandling/AppException"
import { CustomBadRequestException } from "../errorHandling/CustomBadRequestException"
import { LogContext } from "../common/LogContext"

@Injectable()
@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService, private logContext: LogContext) {}

  catch(error: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()

    const exception = this.parseError(error)
    this.logger.logError(exception, this.logContext)
    response.status(exception.getStatus()).send(exception.getResponse())
  }

  parseError(error: Error): AppException {
    if (error.name === "BadRequestException") {
      return new CustomBadRequestException(<BadRequestException>error)
    }

    if ("getResponse" in error && typeof error.getResponse === "function") {
      return <AppException>error
    }

    return new AppException(500, error.name, error.message, error)
  }
}
