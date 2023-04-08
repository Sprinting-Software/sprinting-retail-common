import { Injectable } from "@nestjs/common"
import { ClientException } from "../errorHandling/ClientException"

@Injectable()
export default class TenantContext {
  constructor(tenantId?: number) {
    if (tenantId) {
      this._tenantId = tenantId
    }
  }
  private readonly _tenantId: number
  public get tenantId() {
    if (!this._tenantId) {
      throw new ClientException("UndefinedTenant", "At this point the tenantId should have beenbe defined")
    }
    return this._tenantId
  }

  public get tenantIdOrUndefined() {
    if (!this._tenantId) {
      return undefined
    }
    return this._tenantId
  }

  public hasTenant(): boolean {
    return !!this._tenantId
  }
}
