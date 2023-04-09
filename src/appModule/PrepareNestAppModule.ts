import { HttpAdapterHost } from "@nestjs/core"
import { LoadBalancingTimeoutBootstrap } from "../helpers/LoadBalancingTimeoutBootstrap"

export function PrepareNestAppModule(param: any) {
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
