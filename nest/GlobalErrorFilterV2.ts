import { ArgumentsHost, Catch, ExceptionFilter, Injectable, HttpStatus } from "@nestjs/common"
import { ApmHelper } from "../apm/ApmHelper"
import { LogContext } from "../common/LogContext"
import { CommonException } from "../errorHandling/CommonException"
import { ErrorFactoryV2 } from "../errorHandling/ErrorFactoryV2"
import { LoggerServiceV2 } from "../logger/LoggerServiceV2"

@Injectable()
@Catch()
export class GlobalErrorFilterV2 implements ExceptionFilter {
  constructor(private logger: LoggerServiceV2, private logContext: LogContext) {
    if (this.logContext?.userIdContext?.userId) {
      ApmHelper.getApmAgent().setUserContext({ id: this.logContext.userIdContext.userId })
    }
    if (this.logContext?.tenantContext?.tenantId) {
      ApmHelper.getApmAgent().addLabels({ tenant: `tid${this.logContext.tenantContext.tenantId}` })
    }
  }

  catch(error: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()

    const mappedError: CommonException = ErrorFactoryV2.parseAnyError(error)
    this.logger.logError(__filename, mappedError, this.logContext)
    response.status(mappedError.httpStatus ?? HttpStatus.BAD_GATEWAY).send(mappedError.toJson())
  }
}
