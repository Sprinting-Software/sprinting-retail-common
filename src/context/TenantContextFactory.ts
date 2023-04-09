import TenantContext from "./TenantContext";

export class TenantContextFactory {
  public static getTenantContext(request: Request) {
    const t: string = request.headers["x-tenantid"]
    if (t) {
      const tenantId: number = Number.isInteger(Number(t)) ? parseInt(t) : undefined
      return new TenantContext(tenantId)
    } else {
      return new TenantContext()
    }
  }
}
