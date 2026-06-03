import { RawLogger } from "../logger/RawLogger"

/**
 * Boot-time, set-once configuration for sprinting-retail-common.
 *
 * The purpose of this class is to remove the need for behavioural forks of the library
 * (e.g. the legacy "-withErrorMessage" branches) that differ from mainline by nothing more
 * than a single toggle. Instead of branching, a consuming application opts in to the desired
 * behaviour exactly once, at startup, before the Nest application begins handling requests.
 *
 * The settings are immutable after the first `configure()` call. Calling `configure()` a second
 * time is treated as a fatal programming error and terminates the process: a library whose
 * global behaviour can silently change at runtime is impossible to reason about, and a
 * double-configure almost always means two different parts of the system disagree about how the
 * library should behave.
 */
export interface LibrarySettingsOptions {
  /**
   * When true, the human-readable error `description` is included as `message` in the HTTP
   * response body for general (non-security) errors.
   *
   * Defaults to false so that internal error descriptions are never leaked to clients unless a
   * service explicitly opts in. Setting this to true reproduces the behaviour of the legacy
   * `-withErrorMessage` library fork (as used by BifrostNest).
   */
  includeErrorMessageInHttpResponse?: boolean
}

const DEFAULTS: Required<LibrarySettingsOptions> = {
  includeErrorMessageInHttpResponse: false,
}

export class LibrarySettings {
  private static _current: Required<LibrarySettingsOptions> = { ...DEFAULTS }
  private static _configured = false

  /**
   * Applies the library settings. May be called at most once, at boot time, before the
   * application starts handling requests. A second call is a fatal misconfiguration and
   * terminates the process.
   *
   * Any option left undefined falls back to its safe default.
   */
  static configure(options: LibrarySettingsOptions): void {
    if (LibrarySettings._configured) {
      RawLogger.error(
        "LibrarySettings.configure() was called more than once. Library settings are set-once at boot time. " +
          "This is a fatal programming error (two parts of the system disagree about library behaviour). " +
          "Terminating the process."
      )
      // Deliberately kill the process: a re-configured library is not safe to keep running.
      process.exit(1)
    }
    LibrarySettings._configured = true
    LibrarySettings._current = { ...DEFAULTS, ...options }
  }

  /** True once `configure()` has been called. */
  static get isConfigured(): boolean {
    return LibrarySettings._configured
  }

  /** See {@link LibrarySettingsOptions.includeErrorMessageInHttpResponse}. */
  static get includeErrorMessageInHttpResponse(): boolean {
    return LibrarySettings._current.includeErrorMessageInHttpResponse
  }

  /**
   * Test-only helper that resets the settings back to defaults so each test can configure
   * independently. Never call this from production code.
   */
  static resetForTests(): void {
    LibrarySettings._current = { ...DEFAULTS }
    LibrarySettings._configured = false
  }
}
