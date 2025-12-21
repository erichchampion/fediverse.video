import { createRestAPIClient, createStreamingAPIClient } from "masto";
import type { mastodon } from "masto";
import { storageService, relationshipCache } from "@lib/storage";
import { API_CONFIG } from "@config/index";
import { requestQueue, RequestPriority } from "./requestQueue";

/**
 * Mastodon API Client Factory
 * Phase 1.2: API Client implementation
 */

// Client cache to avoid recreating clients
const clientCache = new Map<string, ReturnType<typeof createRestAPIClient>>();

/**
 * Create or get cached Mastodon REST API client
 */
export function createMastodonClient(
  instanceUrl: string,
  accessToken: string,
): ReturnType<typeof createRestAPIClient> {
  const cacheKey = `${instanceUrl}_${accessToken}`;

  // Return cached client if exists
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  // Create new client
  const client = createRestAPIClient({
    url: instanceUrl,
    accessToken,
    timeout: API_CONFIG.DEFAULT_TIMEOUT,
  });

  // Cache it
  clientCache.set(cacheKey, client);

  return client;
}

/**
 * Create Mastodon Streaming API client
 */
export function createMastodonStreamingClient(
  instanceUrl: string,
  accessToken: string,
): ReturnType<typeof createStreamingAPIClient> {
  return createStreamingAPIClient({
    streamingApiUrl:
      instanceUrl.replace("https://", "wss://") + "/api/v1/streaming",
    accessToken,
  });
}

/**
 * Clear client cache (call on logout)
 */
export function clearClientCache(): void {
  clientCache.clear();
}

/**
 * Get client for active instance
 */
export async function getActiveClient(): Promise<{
  client: ReturnType<typeof createRestAPIClient>;
  instanceUrl: string;
} | null> {
  try {
    const instance = await storageService.getActiveInstance();
    if (!instance) return null;

    const authData = await storageService.getAuthData(instance.id);
    if (!authData) return null;

    const client = createMastodonClient(instance.url, authData.accessToken);

    return { client, instanceUrl: instance.url };
  } catch (error) {
    console.error("Error getting active client:", error);
    return null;
  }
}

/**
 * Request wrapper with error handling and retries
 * Now uses request queue to prevent rate limiting
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  priority: RequestPriority = RequestPriority.NORMAL,
  cacheKey?: string,
): Promise<T> {
  // Use request queue to throttle and manage requests
  return requestQueue.enqueue(fn, priority, cacheKey);
}

/**
 * Common API operations
 */
export class MastodonAPI {
  private client: ReturnType<typeof createRestAPIClient>;
  private instanceUrl: string;

  constructor(instanceUrl: string, accessToken: string) {
    this.instanceUrl = instanceUrl;
    this.client = createMastodonClient(instanceUrl, accessToken);
  }

  // Timeline operations
  async getHomeTimeline(
    options?: mastodon.rest.v1.ListTimelineParams,
  ): Promise<mastodon.v1.Status[]> {
    const paginator = this.client.v1.timelines.home.list(options);
    return withRetry<mastodon.v1.Status[]>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || [];
    });
  }

  async getPublicTimeline(
    options?: mastodon.rest.v1.ListTimelineParams,
  ): Promise<mastodon.v1.Status[]> {
    const paginator = this.client.v1.timelines.public.list(options);
    return withRetry<mastodon.v1.Status[]>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || [];
    });
  }

  async getHashtagTimeline(
    hashtag: string,
    options?: mastodon.rest.v1.ListTimelineParams,
  ): Promise<mastodon.v1.Status[]> {
    const paginator = this.client.v1.timelines.tag
      .$select(hashtag)
      .list(options);
    return withRetry<mastodon.v1.Status[]>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || [];
    });
  }

  async getListTimeline(
    listId: string,
    options?: mastodon.rest.v1.ListTimelineParams,
  ): Promise<mastodon.v1.Status[]> {
    const paginator = this.client.v1.timelines.list
      .$select(listId)
      .list(options);
    return withRetry<mastodon.v1.Status[]>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || [];
    });
  }

  // Status operations
  async getStatus(id: string) {
    return withRetry(() => this.client.v1.statuses.$select(id).fetch());
  }

  async getStatusContext(id: string) {
    return withRetry(() => this.client.v1.statuses.$select(id).context.fetch());
  }

  async favouriteStatus(id: string) {
    return withRetry(() => this.client.v1.statuses.$select(id).favourite());
  }

  async unfavouriteStatus(id: string) {
    return withRetry(() => this.client.v1.statuses.$select(id).unfavourite());
  }

  async reblogStatus(id: string) {
    return withRetry(() => this.client.v1.statuses.$select(id).reblog());
  }

  async unreblogStatus(id: string) {
    return withRetry(() => this.client.v1.statuses.$select(id).unreblog());
  }

  async bookmarkStatus(id: string) {
    return withRetry(() => this.client.v1.statuses.$select(id).bookmark());
  }

  async unbookmarkStatus(id: string) {
    return withRetry(() => this.client.v1.statuses.$select(id).unbookmark());
  }

  async deleteStatus(id: string) {
    return withRetry(() => this.client.v1.statuses.$select(id).remove());
  }

  async createStatus(params: mastodon.rest.v1.CreateStatusParams) {
    return withRetry(() => this.client.v1.statuses.create(params));
  }

  // Account operations
  async getAccount(id: string) {
    return withRetry(() => this.client.v1.accounts.$select(id).fetch());
  }

  async getAccountStatuses(
    id: string,
    options?: mastodon.rest.v1.ListAccountStatusesParams,
  ): Promise<mastodon.v1.Status[]> {
    const paginator = this.client.v1.accounts
      .$select(id)
      .statuses.list(options);
    return withRetry<mastodon.v1.Status[]>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || [];
    });
  }

  async followAccount(id: string) {
    const result = await withRetry(
      () => this.client.v1.accounts.$select(id).follow(),
      RequestPriority.HIGH,
    );
    // Update relationship cache
    relationshipCache.update(this.instanceUrl, id, { following: true });
    return result;
  }

  async unfollowAccount(id: string) {
    const result = await withRetry(
      () => this.client.v1.accounts.$select(id).unfollow(),
      RequestPriority.HIGH,
    );
    // Update relationship cache
    relationshipCache.update(this.instanceUrl, id, { following: false });
    return result;
  }

  async blockAccount(id: string) {
    const result = await withRetry(
      () => this.client.v1.accounts.$select(id).block(),
      RequestPriority.HIGH,
    );
    // Update relationship cache
    relationshipCache.update(this.instanceUrl, id, { blocking: true });
    return result;
  }

  async unblockAccount(id: string) {
    const result = await withRetry(
      () => this.client.v1.accounts.$select(id).unblock(),
      RequestPriority.HIGH,
    );
    // Update relationship cache
    relationshipCache.update(this.instanceUrl, id, { blocking: false });
    return result;
  }

  async muteAccount(id: string) {
    const result = await withRetry(
      () => this.client.v1.accounts.$select(id).mute(),
      RequestPriority.HIGH,
    );
    // Update relationship cache
    relationshipCache.update(this.instanceUrl, id, { muting: true });
    return result;
  }

  async unmuteAccount(id: string) {
    const result = await withRetry(
      () => this.client.v1.accounts.$select(id).unmute(),
      RequestPriority.HIGH,
    );
    // Update relationship cache
    relationshipCache.update(this.instanceUrl, id, { muting: false });
    return result;
  }

  // Relationship operations with caching
  async getRelationships(ids: string[]) {
    // Check cache first
    const cachedRelationships = relationshipCache.getMultiple(
      this.instanceUrl,
      ids,
    );
    const uncachedIds = ids.filter((id) => !cachedRelationships.has(id));

    // Fetch uncached relationships
    if (uncachedIds.length > 0) {
      const relationships = await withRetry(
        () => this.client.v1.accounts.relationships.fetch({ id: uncachedIds }),
        RequestPriority.NORMAL,
      );

      // Cache the results
      const relationshipMap = new Map();
      for (const rel of relationships) {
        relationshipMap.set(rel.id, {
          following: rel.following,
          followedBy: rel.followedBy,
          blocking: rel.blocking,
          blockedBy: rel.blockedBy,
          muting: rel.muting,
          mutingNotifications: rel.mutingNotifications,
          requested: rel.requested,
          domainBlocking: rel.domainBlocking,
          endorsed: rel.endorsed,
          note: rel.note || "",
        });
      }
      relationshipCache.setMultiple(this.instanceUrl, relationshipMap);

      // Merge with cached results
      for (const [id, status] of relationshipMap) {
        cachedRelationships.set(id, status);
      }
    }

    return Array.from(cachedRelationships.entries()).map(([id, status]) => ({
      id,
      ...status,
    }));
  }

  // Search
  async search(query: string, options?: mastodon.rest.v2.SearchParams) {
    const paginator = this.client.v2.search.list({ q: query, ...options });
    return withRetry<mastodon.v2.Search>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || { accounts: [], statuses: [], hashtags: [] };
    });
  }

  // Lists
  async getLists() {
    const paginator = this.client.v1.lists.list();
    return withRetry<mastodon.v1.List[]>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || [];
    });
  }

  async getList(id: string) {
    return withRetry(() => this.client.v1.lists.$select(id).fetch());
  }

  // Trending content
  async getTrendingHashtags(limit: number = 5) {
    return withRetry(async () => {
      try {
        const paginator = this.client.v1.trends.tags.list({ limit });
        const results = [];
        for await (const page of paginator) {
          results.push(...page);
          if (results.length >= limit) break;
        }
        return results.slice(0, limit);
      } catch (error) {
        console.warn("[MastodonAPI] Error fetching trending hashtags:", error);
        return []; // Return empty array on error
      }
    });
  }

  // Favourites and Bookmarks
  async getFavourites(
    options?: mastodon.rest.v1.ListTimelineParams,
  ): Promise<mastodon.v1.Status[]> {
    const paginator = this.client.v1.favourites.list(options);
    return withRetry<mastodon.v1.Status[]>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || [];
    });
  }

  async getBookmarks(
    options?: mastodon.rest.v1.ListTimelineParams,
  ): Promise<mastodon.v1.Status[]> {
    const paginator = this.client.v1.bookmarks.list(options);
    return withRetry<mastodon.v1.Status[]>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || [];
    });
  }

  // Media
  async uploadMedia(file: { uri: string; name: string; type: string }) {
    return withRetry(async () => {
      // For React Native, we need to create a FormData object
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);

      // Use the masto.js media upload endpoint
      return this.client.v2.media.create({
        file: formData as any,
      });
    }, RequestPriority.HIGH);
  }

  // Account credentials operations
  async verifyCredentials() {
    return withRetry(() => this.client.v1.accounts.verifyCredentials());
  }

  async updateCredentials(params: mastodon.rest.v1.UpdateCredentialsParams) {
    return withRetry(
      () => this.client.v1.accounts.updateCredentials(params),
      RequestPriority.HIGH,
    );
  }

  // Preferences operations
  async getPreferences() {
    return withRetry(() => this.client.v1.preferences.fetch());
  }

  // Following/Followers operations
  async getFollowing(
    accountId: string,
    options?: { limit?: number; maxId?: string; sinceId?: string },
  ) {
    const paginator = this.client.v1.accounts
      .$select(accountId)
      .following.list(options);
    return withRetry<mastodon.v1.Account[]>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || [];
    });
  }

  async getFollowers(
    accountId: string,
    options?: { limit?: number; maxId?: string; sinceId?: string },
  ) {
    const paginator = this.client.v1.accounts
      .$select(accountId)
      .followers.list(options);
    return withRetry<mastodon.v1.Account[]>(async () => {
      const iterator = paginator[Symbol.asyncIterator]();
      const result = await iterator.next();
      return result.value || [];
    });
  }
}

export default MastodonAPI;

// Export request queue and priority for use in other modules
export { requestQueue, RequestPriority } from "./requestQueue";
