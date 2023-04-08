import { Module } from "@nestjs/common"
import { HttpAdapterHost } from "@nestjs/core"
import { LoadBalancingTimeoutBootstrap } from "./LoadBalancingTimeoutBootstrap"
import { ConfigModule } from "./ConfigModule";
import { LoggerModule } from "./LoggerModule";

@Module({
  imports: [ConfigModule, LoggerModule],
  exports: [LoggerModule],
  controllers: [],
  providers: [
    HttpAdapterHost,
    {
      provide: LoadBalancingTimeoutBootstrap,
      useFactory: (refHost: HttpAdapterHost<any>) =>
        new LoadBalancingTimeoutBootstrap(() => refHost.httpAdapter.getHttpServer()),
      inject: [HttpAdapterHost],
    },
  ],
})
export class CommonAppModule {}
