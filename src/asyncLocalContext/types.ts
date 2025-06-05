export type TenantAndUser = {
  userId: string
  tenantId: number
}

export type ClientTrace = {
  clientTraceId?: string | undefined
  clientInMemoryId?: string | undefined
  clientLoginSessionId?: string | undefined
  clientRoute?: string | undefined
  clientRouteRaw?: string | undefined
  clientRouteFull?: string | undefined
  clientDomain?: string | undefined
  clientAppVersion?: string | undefined
  clientAppCommitHash?: string | undefined
}

export type RequestTrace = {
  requestDomain?: string
  requestUrl?: string
  requestRouteRaw?: string
  requestRoute?: string
}

export type AsyncContextOptions = {
  /**
   * Set to true if you want to allow the default context to be initialized with properties.
   * This should only be used in testing.
   */
  allowDefaultContextPropertyInitialization?: boolean
  /**
   * Set to true if you want to allow the default context to be initialized with properties repeatedly.
   * This should only be used in testing.
   */
  allowDefaultContextPropertyInitializationRepeatedly?: boolean

  /**
   * Set to true if you want to force strict handling of the tenantId header. When this is set to true,
   * then you are enforcing all endpoints to have the X-TenantId header set unless the endpoint
   * is decorated with the @AllowMissingTenantIdHeader() decorator.
   */
  strictHandlingOfTenantIdHeader?: boolean
}

/**
 * This function will be invoked every time local context is initialized.
 */
export type setApmLabelCallback = (key: string, value: any) => void
