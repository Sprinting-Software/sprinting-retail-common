import { Injectable } from "@nestjs/common"
import { ErrorFactoryV2 } from "../errorHandling/ErrorFactoryV2"
export type TenantId = number

@Injectable()
export class TenantContext {
  constructor(tenantId?: TenantId) {
    if (tenantId) {
      this._tenantId = tenantId
    }
  }
  private _tenantId: TenantId
  public get tenantId() {
    if (!this._tenantId) {
      throw ErrorFactoryV2.createNamedException("TenantIdUndefined").setDescription(
        "A tenantId must always be determined. Probably you forgot to supply a http header X-TenantId or X-TenantAlias"
      )
    }
    return this._tenantId
  }

  public hasTenant(): boolean {
    return !!this._tenantId
  }

  public initTenantId(tenantId: TenantId) {
    if (this._tenantId) {
      throw ErrorFactoryV2.createNamedException(
        "CodingError",
        "Cannot initialize twice. This can only happen if the middleware code is incorrect. "
      ).addContextData({ tenantId, alreadySetTenantId: this._tenantId })
    }
    this._tenantId = tenantId
  }
}
