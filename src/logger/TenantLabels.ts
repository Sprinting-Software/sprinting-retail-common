export type TenantLabels = { tenantId: number; tenant: string }

/**
 * The tenant labels of a log record: `tenantId` 21 and the moniker `tenant` "tid21", the same pair
 * SystemContextBase.initTenantId puts on the trace context. Accepts 21, "21" or "tid21".
 */
export function toTenantLabels(tenantId: unknown): TenantLabels | undefined {
  const raw = typeof tenantId === "string" ? tenantId.trim().replace(/^tid/i, "") : tenantId
  const id = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN
  return Number.isSafeInteger(id) && id > 0 ? { tenantId: id, tenant: `tid${id}` } : undefined
}

/**
 * The labels context of one record. Convention: a record's tenant is the `tenantId` of its own data,
 * i.e. the event context of an event, the context data of an error, the message data of
 * info/debug/warn. When that names a tenant it sets the record's tenant (`labels.tenant`), over the
 * trace context; otherwise the trace context's tenant stays.
 */
export function withRecordTenant(context: Record<string, any> | undefined, recordData?: unknown) {
  const tenantLabels = toTenantLabels((recordData as Record<string, unknown> | undefined)?.tenantId)
  return tenantLabels ? { ...context, ...tenantLabels } : context
}

/**
 * The labels of an ELK v9 record carry tenants as monikers only (`tenant` "tid21", `rootTenant`); the numeric
 * `tenantId`/`rootTenantId` of the trace context are left out, so each label has one type in every data stream.
 */
export function withoutNumericTenantIds(context: Record<string, any> | undefined) {
  if (!context || !Object.keys(context).some(isNumericTenantIdKey)) return context
  return Object.fromEntries(Object.entries(context).filter(([key]) => !isNumericTenantIdKey(key)))
}

/** The trace context keys that hold numeric tenant ids; logs and APM labels carry the monikers instead. */
export function isNumericTenantIdKey(key: string): boolean {
  return key === "tenantId" || key === "rootTenantId"
}
