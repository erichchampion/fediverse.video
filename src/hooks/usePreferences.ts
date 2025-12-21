import { useState, useEffect } from "react";
import { useAuth } from "@contexts/AuthContext";
import { getActiveClient } from "@lib/api/client";
import type { MastodonPreferences } from "@types";

/**
 * Hook to fetch and manage Mastodon account preferences
 * These are server-side preferences that sync across all Mastodon clients
 */
export function usePreferences() {
  const { user, instance } = useAuth();
  const [preferences, setPreferences] = useState<MastodonPreferences | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch preferences on mount
  useEffect(() => {
    if (!user || !instance) {
      setIsLoading(false);
      return;
    }

    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const activeClient = await getActiveClient();
        if (!activeClient) {
          throw new Error("No active client");
        }

        const prefs = await activeClient.client.v1.preferences.fetch();

        // Transform to our type format
        const transformedPrefs: MastodonPreferences = {
          "posting:default:visibility":
            prefs["posting:default:visibility"] || "public",
          "posting:default:sensitive":
            prefs["posting:default:sensitive"] || false,
          "posting:default:language": prefs["posting:default:language"] || null,
          "posting:default:quote_policy": (prefs as any)[
            "posting:default:quote_policy"
          ],
          "reading:expand:media": prefs["reading:expand:media"] || "default",
          "reading:expand:spoilers": prefs["reading:expand:spoilers"] || false,
        };

        setPreferences(transformedPrefs);
      } catch (err) {
        console.error("[usePreferences] Error fetching preferences:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch preferences",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [user, instance]);

  /**
   * Refresh preferences from server
   */
  const refresh = async () => {
    if (!user || !instance) return;

    try {
      setIsLoading(true);
      setError(null);

      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      const prefs = await activeClient.client.v1.preferences.fetch();

      const transformedPrefs: MastodonPreferences = {
        "posting:default:visibility":
          prefs["posting:default:visibility"] || "public",
        "posting:default:sensitive":
          prefs["posting:default:sensitive"] || false,
        "posting:default:language": prefs["posting:default:language"] || null,
        "posting:default:quote_policy": (prefs as any)[
          "posting:default:quote_policy"
        ],
        "reading:expand:media": prefs["reading:expand:media"] || "default",
        "reading:expand:spoilers": prefs["reading:expand:spoilers"] || false,
      };

      setPreferences(transformedPrefs);
    } catch (err) {
      console.error("[usePreferences] Error refreshing preferences:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh preferences",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    preferences,
    isLoading,
    error,
    refresh,
  };
}
