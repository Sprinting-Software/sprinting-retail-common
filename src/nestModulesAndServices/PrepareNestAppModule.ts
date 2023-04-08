import { HttpAdapterHost } from "@nestjs/core"
import { LoadBalancingTimeoutBootstrap } from "./LoadBalancingTimeoutBootstrap"

export function PrepareNestAppModule(param: any) {
  const NestScope = {
    REQUEST: 2,
  }
  const NestConstants = {
    APP_FILTER: "APP_FILTER",
  }
  return {
    imports: param.imports,
    controllers: param.controllers,
    exports: param.exports,
    providers: [...extraProviders, ...param.providers],
  }
}

const extraProviders = [
  {
    provide: LoadBalancingTimeoutBootstrap,
    useFactory: (refHost: HttpAdapterHost<any>) =>
      new LoadBalancingTimeoutBootstrap(() => refHost.httpAdapter.getHttpServer()),
    inject: [HttpAdapterHost],
  },
]