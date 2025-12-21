/**
 * Mastodon API Request Helpers
 * Provides iterator-based pagination for timelines
 */

import type { mastodon } from "masto";
import { API_LIMITS, FEED_CONFIG } from "@/config";

export type MastodonClient = ReturnType<
  typeof import("masto").createRestAPIClient
>;
export type Status = mastodon.v1.Status;

export interface TimelinePaginator {
  [Symbol.asyncIterator](): AsyncIterator<Status[]>;
  next(): Promise<IteratorResult<Status[]>>;
}

export interface PaginationOptions {
  limit?: number;
  maxId?: string;
  minId?: string;
  sinceId?: string;
}

/**
 * Build a timeline iterator based on feed type
 * This returns the masto.js async iterable that handles pagination automatically
 */
function buildTimelineIterator(
  client: MastodonClient,
  feedType:
    | "home"
    | "local"
    | "public"
    | "favourites"
    | "bookmarks"
    | "list"
    | "hashtag"
    | "account",
  feedId: string | undefined,
  params: PaginationOptions,
) {
  if (!client?.v1) {
    throw new Error("Mastodon client not available");
  }

  const p = { limit: params.limit ?? 20, ...params };

  switch (feedType) {
    case "home":
      return client.v1.timelines.home.list(p);
    case "public":
      return client.v1.timelines.public.list(p);
    case "local":
      return client.v1.timelines.public.list({ ...p, local: true });
    case "list":
      if (!feedId) throw new Error("List ID is required for list feeds");
      return client.v1.timelines.list.$select(feedId).list(p);
    case "hashtag":
      if (!feedId) throw new Error("Hashtag is required for hashtag feeds");
      return client.v1.timelines.tag.$select(feedId).list(p);
    case "account":
      if (!feedId) throw new Error("Account ID is required for account feeds");
      return client.v1.accounts.$select(feedId).statuses.list(p);
    case "favourites":
      return client.v1.favourites.list(p);
    case "bookmarks":
      return client.v1.bookmarks.list(p);
    default:
      throw new Error(`Unknown feed type: ${feedType}`);
  }
}

/**
 * Get a directional timeline paginator
 *
 * This creates an iterator that can fetch posts in a specific direction:
 * - 'older': Fetch posts older than the current set (using maxId)
 * - 'newer': Fetch posts newer than the current set (using sinceId)
 *
 * The iterator maintains its own pagination state and can be called
 * multiple times with .next() to fetch successive pages.
 *
 * @param client - Mastodon REST API client
 * @param feedType - Type of feed to fetch
 * @param feedId - ID for specific feeds (list, hashtag, account)
 * @param direction - Direction to paginate ('older' or 'newer')
 * @param params - Initial pagination parameters (maxId, sinceId, limit)
 * @returns TimelinePaginator that can be iterated
 */
export function getDirectionalTimelinePaginator(
  client: MastodonClient,
  feedType:
    | "home"
    | "local"
    | "public"
    | "favourites"
    | "bookmarks"
    | "list"
    | "hashtag"
    | "account",
  feedId: string | undefined,
  direction: "older" | "newer",
  params: PaginationOptions = {},
): TimelinePaginator {
  // The masto.js iterator that will be created lazily
  let mastoIterator: AsyncIterator<Status[]> | null = null;
  let hasMore = true;

  const createIterator = () => {
    if (!client?.v1) {
      throw new Error("Mastodon client not available");
    }

    // Set up directional parameters
    const directionalParams = { ...params };

    // For directional pagination, ensure only the relevant parameter is set
    if (direction === "newer" && params.sinceId) {
      // For newer posts, we want posts after the sinceId
      directionalParams.sinceId = params.sinceId;
      delete directionalParams.maxId;
    } else if (direction === "older" && params.maxId) {
      // For older posts, we want posts before the maxId
      directionalParams.maxId = params.maxId;
      delete directionalParams.sinceId;
    }

    console.log(
      `[mastodonRequests] Creating ${direction} iterator with params:`,
      directionalParams,
    );

    const timelineIterator = buildTimelineIterator(
      client,
      feedType,
      feedId,
      directionalParams,
    );
    return (timelineIterator as AsyncIterable<Status[]>)[
      Symbol.asyncIterator
    ]();
  };

  return {
    [Symbol.asyncIterator](): AsyncIterator<Status[]> {
      return {
        async next(): Promise<IteratorResult<Status[]>> {
          if (!hasMore) {
            return { done: true, value: undefined };
          }

          try {
            // Initialize the masto iterator on first call
            if (!mastoIterator) {
              mastoIterator = createIterator();
            }

            // Use the masto iterator to get the next page
            const result = await mastoIterator.next();

            if (result.done) {
              console.log(`[mastodonRequests] ${direction} iterator exhausted`);
              hasMore = false;
              return { done: true, value: undefined };
            }

            const posts = result.value;
            console.log(
              `[mastodonRequests] ${direction} iterator returned ${posts.length} posts`,
            );

            return {
              done: false,
              value: posts,
            };
          } catch (error) {
            console.error(
              `[mastodonRequests] Error in ${direction} iterator:`,
              error,
            );
            hasMore = false;
            throw error;
          }
        },
      };
    },

    async next(): Promise<IteratorResult<Status[]>> {
      // Get the iterator from this object
      const iterator = this[Symbol.asyncIterator]();
      // Call next() on the iterator and return the result
      return iterator.next();
    },
  };
}

/**
 * Get followed accounts for the current user
 */
export async function getFollowedAccounts(client: MastodonClient) {
  if (!client?.v1) {
    throw new Error("Mastodon client not available");
  }

  try {
    // First get the current user
    const currentUser = await client.v1.accounts.verifyCredentials();

    // Then get the list of accounts they're following
    const paginator = client.v1.accounts
      .$select(currentUser.id)
      .following.list({
        limit: API_LIMITS.FOLLOWED_ACCOUNTS,
      });

    // Iterate through the paginator using .values() to get the async iterable
    const results = [];
    for await (const page of paginator.values()) {
      results.push(...page);
      break; // Only need the first page
    }

    return results;
  } catch (error) {
    console.error(
      "[mastodonRequests] Error fetching followed accounts:",
      error,
    );
    throw error;
  }
}

/**
 * Get followed hashtags for the current user
 */
export async function getFollowedHashtags(client: MastodonClient) {
  if (!client?.v1) {
    throw new Error("Mastodon client not available");
  }

  try {
    const paginator = client.v1.followedTags.list({
      limit: API_LIMITS.FOLLOWED_HASHTAGS,
    });

    // Iterate through the paginator using .values() to get the async iterable
    const results = [];
    for await (const page of paginator.values()) {
      results.push(...page);
      break; // Only need the first page
    }

    return results;
  } catch (error) {
    console.error(
      "[mastodonRequests] Error fetching followed hashtags:",
      error,
    );
    throw error;
  }
}

/**
 * Get account suggestions for the current user
 */
export async function getSuggestions(
  client: MastodonClient,
  limit: number = FEED_CONFIG.DEFAULT_PAGE_SIZE,
) {
  if (!client?.v1) {
    throw new Error("Mastodon client not available");
  }

  try {
    const paginator = client.v1.suggestions.list({
      limit,
    });

    // Iterate through the paginator using .values() to get the async iterable
    const results = [];
    for await (const page of paginator.values()) {
      results.push(...page);
      if (results.length >= limit) break;
    }

    const finalResults = results.slice(0, limit);

    // Log for debugging
    console.log(
      `[mastodonRequests] Fetched ${finalResults.length} suggestions`,
    );
    if (finalResults.length > 0) {
      console.log(
        "[mastodonRequests] First suggestion:",
        JSON.stringify(finalResults[0], null, 2),
      );
    }

    return finalResults;
  } catch (error) {
    console.error("[mastodonRequests] Error fetching suggestions:", error);
    throw error;
  }
}
