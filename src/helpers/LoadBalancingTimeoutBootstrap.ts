import { Injectable, Module, OnApplicationBootstrap } from "@nestjs/common"
import { HttpAdapterHost } from "@nestjs/core"

export class LoadBalancingTimeoutBootstrap implements OnApplicationBootstrap {
  constructor(private readonly serverGetter: any) {}

  onApplicationBootstrap() {
    const server = this.serverGetter()
    server.keepAliveTimeout = 65000 // Ensure all inactive connections are terminated by the ALB, by setting this a few seconds higher than the ALB idle timeout
    server.headersTimeout = 66000 // Ensure the headersTimeout is set higher than the keepAliveTimeout due to this nodejs regression bug: https://github.com/nodejs/node/issues/27363
    // eslint-disable-next-line
    console.log("Running LoadBalancingTimeoutBootstrap to fix issues with the load balancers such as ALB")
  }
}
