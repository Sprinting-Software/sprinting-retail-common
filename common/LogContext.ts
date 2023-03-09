import { TenantContext } from "./TenantContext"
import { UserIdContext } from "./UserIdContext"

export class LogContext {
  constructor(public readonly tenantContext: TenantContext, public readonly userIdContext: UserIdContext) {}
}
