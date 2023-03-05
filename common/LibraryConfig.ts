export enum LibraryVersions {
  v1 = 1,
  v2 = 2,
}
/**
 * Certain kind of configurations may be done using this class.
 */
export class LibraryConfig {
  /**
   * Change the version of this if you want to use the library in a different version.
   * The version should be changed at application startup time.
   */
  public static VERSION: LibraryVersions = LibraryVersions.v1;
}
