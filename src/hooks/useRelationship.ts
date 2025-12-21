import { useState, useEffect } from "react";
import { getActiveClient } from "@lib/api/client";
import { useAuth } from "@contexts/AuthContext";
import { relationshipBatcher } from "@lib/api/relationshipBatcher";

/**
 * Custom hook for querying account relationship status
 * Uses batching to efficiently fetch multiple relationships in a single API call
 * This prevents cascading API calls when rendering multiple posts
 */

interface UseRelationshipOptions {
  accountId?: string;
}

interface RelationshipState {
  isFollowing: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useRelationship({
  accountId,
}: UseRelationshipOptions): RelationshipState {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Don't query for user's own account
  const shouldQuery = accountId && user && accountId !== user.id;

  useEffect(() => {
    if (!shouldQuery || !accountId) {
      setIsLoading(false);
      return;
    }

    const fetchRelationship = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get active client
        const activeClient = await getActiveClient();
        if (!activeClient) {
          throw new Error("No active client");
        }

        // Use relationship batcher to batch multiple requests
        // This automatically handles caching and batching
        const relationship = await relationshipBatcher.getRelationship(
          activeClient.client,
          accountId,
        );

        setIsFollowing(relationship.following);
        setIsLoading(false);
      } catch (err) {
        console.error("[useRelationship] Error fetching relationship:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setIsLoading(false);
      }
    };

    fetchRelationship();
  }, [accountId, shouldQuery]);

  return { isFollowing, isLoading, error };
}

/**
 * Clear the relationship cache (useful when following/unfollowing)
 */
export function clearRelationshipCache(accountId?: string) {
  relationshipBatcher.clearCache(accountId);
}

/**
 * Update relationship cache (e.g., after follow/unfollow action)
 */
export function updateRelationshipCache(
  accountId: string,
  updates: { following?: boolean; blocking?: boolean; muting?: boolean },
) {
  relationshipBatcher.updateCache(accountId, updates);
}
