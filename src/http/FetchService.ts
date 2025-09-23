import { Injectable } from "@nestjs/common"
import { LoggerService2 } from "../logger/LoggerService2"
import {
  ApiCall as FofApiCall,
  fetchOrFail as fofFetchOrFail,
  fetchOrFailRaw as fofFetchOrFailRaw,
  HttpLogOptions,
} from "./fetchOrFail"

@Injectable()
export class FetchService {
  constructor(private readonly logger: LoggerService2) {}

  async fetchOrFail<T = any>(
    input: RequestInfo,
    init?: RequestInit,
    serviceName?: string,
    options?: Omit<HttpLogOptions, "logger">
  ): Promise<T> {
    return fofFetchOrFail(input, init, serviceName, { ...(options || {}), logger: this.logger }) as Promise<T>
  }

  async fetchOrFailRaw(input: RequestInfo, init: RequestInit, serviceName?: string) {
    return fofFetchOrFailRaw(input, init, serviceName)
  }

  ApiCall(
    serviceName: string,
    authorizationHeader?: string,
    contentTypeHeader?: string,
    options?: Omit<HttpLogOptions, "logger">
  ) {
    return FofApiCall(serviceName, authorizationHeader, contentTypeHeader, {
      ...(options || {}),
      logger: this.logger,
    })
  }
}
