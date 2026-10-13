import { isNumericTenantIdKey, toTenantLabels, withoutNumericTenantIds, withRecordTenant } from "../TenantLabels"

describe("toTenantLabels", () => {
  it.each([21, "21", "tid21", " TID21 "])("turns %p into tenantId and the tid moniker", (input) => {
    expect(toTenantLabels(input)).toEqual({ tenantId: 21, tenant: "tid21" })
  })

  it.each([undefined, null, 0, -1, 1.5, "", "abc", "tid", {}, NaN])("ignores %p", (input) => {
    expect(toTenantLabels(input)).toBeUndefined()
  })
})

describe("withRecordTenant", () => {
  it("puts the tenant of the record data on the context", () => {
    expect(withRecordTenant({ userId: "u-1", tenant: "tid2" }, { tenantId: 21, orderNumber: "B1" })).toEqual({
      userId: "u-1",
      tenantId: 21,
      tenant: "tid21",
    })
  })

  it("returns the context itself when the record data names no valid tenant", () => {
    const context = { userId: "u-1" }
    expect(withRecordTenant(context)).toBe(context)
    expect(withRecordTenant(context, { tenantId: "abc" })).toBe(context)
    expect(withRecordTenant(undefined)).toBeUndefined()
  })
})

describe("withoutNumericTenantIds", () => {
  it("drops tenantId and rootTenantId and keeps the monikers", () => {
    expect(
      withoutNumericTenantIds({ tenantId: 21, tenant: "tid21", rootTenantId: 21, rootTenant: "tid21", userId: "u" })
    ).toEqual({
      tenant: "tid21",
      rootTenant: "tid21",
      userId: "u",
    })
    expect(isNumericTenantIdKey("tenant")).toBe(false)
  })
})
