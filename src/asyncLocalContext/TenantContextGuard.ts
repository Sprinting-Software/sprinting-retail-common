import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { Request } from "express"
import { SystemContextBase } from "./SystemContextBase"
import { ClientException } from "../errorHandling/exceptions/ClientException"
import { ALLOW_MISSING_TENANT_ID } from "../decorators/AllowMissingTenantIdHeader"
import { Reflector } from "@nestjs/core"

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly systemContext: SystemContextBase,
    private readonly reflector: Reflector,
    private readonly strictHandlingOfTenantIdHeader = false
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>()

    const _tenantIdFromHeader = req.headers["x-tenantid"] || req.headers["x-tenant-id"]

    const tenantId = _tenantIdFromHeader ? getTenantIdFromHeader(_tenantIdFromHeader as string | string[]) : undefined

    if (tenantId !== undefined) {
      this.systemContext.initTenantId(tenantId)
      return true
    }

    if (this.strictHandlingOfTenantIdHeader) {
      const allowMissing = this.reflector.getAllAndOverride<boolean>(ALLOW_MISSING_TENANT_ID, [
        context.getHandler(),
        context.getClass(),
      ])
      if (!allowMissing) throw new ClientException("TenantIdMissing", "Request is missing required X-TenantId header")
    }

    return true
  }
}

function getTenantIdFromHeader(tenantIdFromHeader: string | string[]): number {
  if (typeof tenantIdFromHeader === "string") {
    return parseInt(tenantIdFromHeader, 10)
  } else if (Array.isArray(tenantIdFromHeader) && tenantIdFromHeader.length > 0) {
    throw new ClientException("MultipleTenantIdsInHeader", "X-TenantId header should contain a single integer value", {
      tenantIdFromHeader,
    })
  } else {
    throw new ClientException("TenantIdHeaderMissing", "This is not expected", { tenantIdFromHeader })
  }
}
