/**
 * Global type declarations and augmentations
 */

/**
 * Type augmentation for AbortSignal to include polyfilled methods
 * These methods are not available in React Native's Hermes engine by default
 */
interface AbortSignalConstructor {
  /**
   * Returns an AbortSignal that aborts when any of the provided signals abort.
   * @param signals - An array of AbortSignal instances
   * @returns A new AbortSignal that aborts when any input signal aborts
   */
  any(signals: AbortSignal[]): AbortSignal;

  /**
   * Returns an AbortSignal that will automatically abort after the specified time.
   * @param milliseconds - The number of milliseconds before the signal aborts
   * @returns A new AbortSignal that aborts after the timeout
   */
  timeout(milliseconds: number): AbortSignal;
}
