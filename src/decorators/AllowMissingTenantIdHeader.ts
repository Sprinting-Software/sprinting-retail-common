import { SetMetadata } from "@nestjs/common"

export const ALLOW_MISSING_TENANT_ID = "allowMissingTenantIdHeader"
export const AllowMissingTenantIdHeader = () => SetMetadata(ALLOW_MISSING_TENANT_ID, true)
