export class LibraryVersioning {
  /**
   * This is the active API version.
   * Override it with the API_VERSIONS value you want to use.
   */
  public static VERSIONS = { v2: 2 }
  public static ACTIVE_VERSION = LibraryVersioning.VERSIONS.v2

  static v2IsActive(): boolean {
    return LibraryVersioning.ACTIVE_VERSION === LibraryVersioning.VERSIONS.v2
  }
}
