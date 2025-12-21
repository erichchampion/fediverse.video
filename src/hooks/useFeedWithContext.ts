import { useState, useCallback } from "react";
import type { Post } from "@types";
import { getActiveClient } from "@lib/api/client";
import { transformStatus } from "@lib/api/timeline";
import { FEED_CONFIG } from "@/config";

/**
 * Hook for fetching feed with context around a specific post
 * This is useful when switching views and wanting to maintain position
 */

interface UseFeedWithContextOptions {
  feedType:
    | "home"
    | "local"
    | "public"
    | "favourites"
    | "bookmarks"
    | "list"
    | "hashtag"
    | "account";
  feedId?: string;
  targetPostId?: string;
  contextSize?: number;
  limit?: number;
}

export function useFeedWithContext() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch posts with a target post at a specific position
   * This ensures the target post is visible when switching views
   */
  const fetchWithContext = useCallback(
    async (options: UseFeedWithContextOptions): Promise<Post[]> => {
      const {
        feedType,
        feedId,
        targetPostId,
        contextSize = 10,
        limit = FEED_CONFIG.DEFAULT_PAGE_SIZE,
      } = options;

      setIsLoading(true);
      setError(null);

      try {
        const activeClient = await getActiveClient();
        if (!activeClient) {
          throw new Error("No active client");
        }

        const { client } = activeClient;

        // If we have a target post ID, fetch posts around it
        if (targetPostId) {
          try {
            // First, try to get the context (posts before and after)
            const context = await client.v1.statuses
              .$select(targetPostId)
              .context.fetch();

            // Get the target post itself
            const targetStatus = await client.v1.statuses
              .$select(targetPostId)
              .fetch();
            const targetPost = transformStatus(targetStatus);

            // Transform ancestors and descendants
            const ancestors = context.ancestors.map(transformStatus);
            const descendants = context.descendants.map(transformStatus);

            // Combine: take last N ancestors, target post, and first N descendants
            const beforeCount = Math.min(contextSize, ancestors.length);
            const afterCount = Math.min(contextSize, descendants.length);

            const postsWithContext = [
              ...ancestors.slice(-beforeCount),
              targetPost,
              ...descendants.slice(0, afterCount),
            ];

            // If we don't have enough posts, fetch more from the feed
            if (postsWithContext.length < limit) {
              const neededCount = limit - postsWithContext.length;
              const additionalPosts = await fetchFeedPosts(
                client,
                feedType,
                feedId,
                neededCount,
                targetPostId,
              );

              // Add additional posts that aren't already in our context
              const existingIds = new Set(
                postsWithContext.filter((p) => p && p.id).map((p) => p.id),
              );
              const uniqueAdditionalPosts = additionalPosts.filter(
                (p) => p && p.id && !existingIds.has(p.id),
              );

              postsWithContext.push(...uniqueAdditionalPosts);
            }

            setIsLoading(false);
            return postsWithContext;
          } catch (contextError) {
            // If context fetch fails (post might be deleted or not accessible),
            // fall back to regular feed fetch
            console.warn(
              "Failed to fetch context, falling back to regular feed:",
              contextError,
            );
          }
        }

        // Regular feed fetch without context
        const posts = await fetchFeedPosts(client, feedType, feedId, limit);
        setIsLoading(false);
        return posts;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch feed";
        setError(errorMessage);
        setIsLoading(false);
        throw err;
      }
    },
    [],
  );

  return {
    fetchWithContext,
    isLoading,
    error,
  };
}

/**
 * Helper function to fetch posts from a feed
 */
async function fetchFeedPosts(
  client: any,
  feedType: string,
  feedId: string | undefined,
  limit: number,
  maxId?: string,
): Promise<Post[]> {
  let statuses;

  const options = { limit, maxId };

  switch (feedType) {
    case "home":
      statuses = await client.v1.timelines.home.list(options);
      break;

    case "public":
      statuses = await client.v1.timelines.public.list(options);
      break;

    case "local":
      statuses = await client.v1.timelines.public.list({
        ...options,
        local: true,
      });
      break;

    case "favourites":
      statuses = await client.v1.favourites.list(options);
      break;

    case "bookmarks":
      statuses = await client.v1.bookmarks.list(options);
      break;

    case "list":
      if (!feedId) throw new Error("List ID is required for list feeds");
      statuses = await client.v1.timelines.list.$select(feedId).list(options);
      break;

    case "hashtag":
      if (!feedId) throw new Error("Hashtag is required for hashtag feeds");
      statuses = await client.v1.timelines.tag.$select(feedId).list(options);
      break;

    case "account":
      if (!feedId) throw new Error("Account ID is required for account feeds");
      statuses = await client.v1.accounts
        .$select(feedId)
        .statuses.list(options);
      break;

    default:
      throw new Error(`Unknown feed type: ${feedType}`);
  }

  return statuses.map(transformStatus);
}
