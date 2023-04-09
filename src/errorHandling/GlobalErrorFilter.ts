import { ArgumentsHost, Catch, ExceptionFilter, Injectable } from "@nestjs/common"
import { LoggerService } from "../logger/LoggerService"
import { LogContext } from "../logger/LogContext"
import { ErrorParser } from "./ErrorParser"

@Injectable()
@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService, private readonly logContext: LogContext) {}

  catch(error: Error, host: ArgumentsHost): void {
    const exception = ErrorParser.parse(error)
    this.logger.logError(exception, this.logContext)

    const ctx = host.switchToHttp()
    const response = ctx.getResponse()

    response.status(exception.getStatus()).send(exception.getResponse())
  }
}