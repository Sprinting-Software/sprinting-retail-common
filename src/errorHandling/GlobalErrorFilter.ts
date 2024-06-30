import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Injectable } from "@nestjs/common"
import { LoggerService } from "../logger/LoggerService"
import { LogContext } from "../logger/LogContext"
import { ExceptionUtil } from "./ExceptionUtil"
import { Exception } from "./exceptions/Exception"

@Injectable()
@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    private readonly logContext: LogContext,
    private readonly hideErrorDetailsInHttpResponse: boolean
  ) {}

  catch(error: Error, host: ArgumentsHost): void {
    const exception = ExceptionUtil.parseV2(error)
    this.logger.logError(exception, this.logContext)
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    response
      .status(exception.getStatus())
      .send(ExceptionUtil.getHttpJsonResponseFromError(exception, this.hideErrorDetailsInHttpResponse))
  }
}
