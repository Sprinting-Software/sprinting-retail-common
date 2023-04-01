export class LibraryVersioning {
  /**
   * This is the active API version.
   * Override it with the API_VERSIONS value you want to use.
   */
  public static ACTIVE_VERSION = 1
  public static VERSIONS = { v1: 1, v2: 2 }
  static v2IsActive(): boolean {
    return LibraryVersioning.ACTIVE_VERSION === LibraryVersioning.VERSIONS.v2
  }
}
