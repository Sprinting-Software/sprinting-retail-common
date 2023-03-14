import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter, Injectable } from "@nestjs/common"
import { LoggerService } from "../logger/LoggerService"
import { AppException } from "../errorHandling/AppException"
import { CustomBadRequestException } from "../errorHandling/CustomBadRequestException"
import { LogContext } from "../common/LogContext"

@Injectable()
@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService, private readonly logContext: LogContext) {}

  catch(error: Error, host: ArgumentsHost): void {
    const exception = this.parseError(error)
    this.logger.logError(exception, this.logContext)

    const ctx = host.switchToHttp()
    const response = ctx.getResponse()

    response.status(exception.getStatus()).send(exception.getResponse())
  }

  private parseError(error: Error): AppException {
    if (error instanceof AppException) {
      return error
    }

    if (error.name === "BadRequestException") {
      return new CustomBadRequestException(<BadRequestException>error)
    }

    if ("getStatus" in error && typeof error.getStatus === "function") {
      return new AppException(error.getStatus(), error.name, error.message).setInnerError(error)
    }

    return new AppException(500, error.name, error.message, error)
  }
}
