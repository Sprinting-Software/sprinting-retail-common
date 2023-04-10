import { OnApplicationBootstrap } from "@nestjs/common"
import { LoggerService } from "../logger/LoggerService"

export class LoadBalancingTimeoutBootstrap implements OnApplicationBootstrap {
  constructor(private readonly refHost: any, private readonly logger: LoggerService) {}

  onApplicationBootstrap() {
    const server = this.refHost.httpAdapter.getHttpServer()
    server.keepAliveTimeout = 65000 // Ensure all inactive connections are terminated by the ALB, by setting this a few seconds higher than the ALB idle timeout
    server.headersTimeout = 66000 // Ensure the headersTimeout is set higher than the keepAliveTimeout due to this nodejs regression bug: https://github.com/nodejs/node/issues/27363
    // eslint-disable-next-line
    this.logger.info(__filename,"Running LoadBalancingTimeoutBootstrap to fix issues with the load balancers such as ALB " + server)
  }
}
