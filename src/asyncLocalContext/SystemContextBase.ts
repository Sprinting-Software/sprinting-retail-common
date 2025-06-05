import { Injectable } from "@nestjs/common"
import { AsyncContext } from "./AsyncContext"
import { TenantAndUser } from "./types"

export const PROPERTY_tenantId = "tenantId"
export const PROPERTY_tenant = "tenant"
const PROPERTY_userId = "userId"
const PROPERTY_userType = "userType"
@Injectable()
export class SystemContextBase implements TenantAndUser {
  constructor(private readonly asyncContext: AsyncContext) {}

  get tenantId(): number {
    return this.asyncContext.getPropertyOrFail<number>(PROPERTY_tenantId)
  }

  /**
   * Initializes the tenantId in the async context.
   * If the value is undefined and exception is thrown.
   * If it has already been initialized, it throws an error.
   * @param value
   * @returns
   */
  initTenantId(value: number) {
    this.asyncContext.initProperty(PROPERTY_tenantId, value)
    // Also initialize the tenant moniker
    this.asyncContext.initProperty(PROPERTY_tenant, `tid${value}`)
  }

  get isTenantIdDefined(): boolean {
    return this.asyncContext.getPropertyOrUndefined(PROPERTY_tenantId) !== undefined
  }

  get userId(): string {
    return this.asyncContext.getPropertyOrFail<string>(PROPERTY_userId)
  }

  get isUserIdDefined(): boolean {
    return this.asyncContext.getPropertyOrUndefined(PROPERTY_userId) !== undefined
  }

  /**
   * Initializes the userId in the async context.
   * If the value is undefined and exception is thrown.
   * If it has already been initialized, it throws an error.
   * @param value
   * @returns
   */
  initUserId(value: string) {
    this.asyncContext.initProperty(PROPERTY_userId, value)
  }

  get userType(): string {
    return this.asyncContext.getPropertyOrFail<string>(PROPERTY_userType)
  }

  get isUserTypeDefined(): boolean {
    return this.asyncContext.getPropertyOrUndefined(PROPERTY_userType) !== undefined
  }
  /**
   * Initializes the userId in the async context.
   * If the value is undefined and exception is thrown.
   * If it has already been initialized, it throws an error.
   * @param value
   * @returns
   */
  initUserType(value: string) {
    this.asyncContext.initProperty(PROPERTY_userType, value)
  }
}
