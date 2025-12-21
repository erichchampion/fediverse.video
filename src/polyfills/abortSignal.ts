/**
 * Polyfill for AbortSignal.any()
 * This method is not available in React Native's Hermes engine
 *
 * AbortSignal.any() takes an array of abort signals and returns a new signal
 * that will be aborted when any of the input signals are aborted.
 */

// Extend the AbortSignal interface to include the polyfilled methods
declare global {
  interface AbortSignalConstructor {
    any(signals: AbortSignal[]): AbortSignal;
    timeout(milliseconds: number): AbortSignal;
  }
}

if (typeof AbortSignal !== "undefined" && !(AbortSignal as any).any) {
  (AbortSignal as any).any = function (signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    // Check if any signal is already aborted
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
    }

    // Listen for abort on any signal
    const onAbort = function (this: AbortSignal) {
      controller.abort(this.reason);

      // Clean up listeners
      for (const signal of signals) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    for (const signal of signals) {
      signal.addEventListener("abort", onAbort);
    }

    return controller.signal;
  };
}

/**
 * Polyfill for AbortSignal.timeout()
 * This method is also not available in Hermes
 *
 * AbortSignal.timeout() creates a signal that will automatically
 * abort after a specified number of milliseconds.
 */
if (typeof AbortSignal !== "undefined" && !(AbortSignal as any).timeout) {
  (AbortSignal as any).timeout = function (milliseconds: number): AbortSignal {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Store timeout ID so we can clear it if signal is aborted early
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!controller.signal.aborted) {
        controller.abort(
          new Error(`TimeoutError: The operation was aborted due to timeout`),
        );
      }
    }, milliseconds);

    // Clear timeout if signal is aborted before timeout
    controller.signal.addEventListener("abort", () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    });

    return controller.signal;
  };
}

export {};
