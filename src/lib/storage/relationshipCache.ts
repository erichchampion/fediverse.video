import { MMKV } from "react-native-mmkv";
import { CACHE_EXPIRATION, STORAGE_LIMITS } from "./constants";

/**
 * Relationship Cache
 * Caches follow/block/mute status to reduce API calls
 * Phase: Performance Optimization
 */

// Lazy MMKV initialization to avoid JSI errors in remote debugging
let relationshipStorage: MMKV | null = null;

function getRelationshipStorage(): MMKV {
  if (!relationshipStorage) {
    try {
      relationshipStorage = new MMKV({ id: "relationships" });
    } catch (error) {
      console.warn("MMKV relationship storage initialization failed:", error);
      throw new Error(
        "MMKV not available - JSI not initialized. Please disable remote debugging.",
      );
    }
  }
  return relationshipStorage;
}

export interface RelationshipStatus {
  following: boolean;
  followedBy: boolean;
  blocking: boolean;
  blockedBy: boolean;
  muting: boolean;
  mutingNotifications: boolean;
  requested: boolean;
  domainBlocking: boolean;
  endorsed: boolean;
  note: string;
}

interface CachedRelationship {
  accountId: string;
  status: RelationshipStatus;
  timestamp: number;
  instanceId: string;
}

/**
 * Relationship Cache Service
 */
export class RelationshipCache {
  private memoryCache = new Map<string, CachedRelationship>();
  private readonly maxCacheSize = STORAGE_LIMITS.MAX_CACHED_RELATIONSHIPS;
  private readonly cacheTTL = CACHE_EXPIRATION.RELATIONSHIPS;

  /**
   * Get cache key for account relationship
   */
  private getCacheKey(instanceId: string, accountId: string): string {
    return `${instanceId}_${accountId}`;
  }

  /**
   * Get relationship from cache
   */
  get(instanceId: string, accountId: string): RelationshipStatus | null {
    const key = this.getCacheKey(instanceId, accountId);

    // Try memory cache first
    let cached = this.memoryCache.get(key);

    // If not in memory, try MMKV storage
    if (!cached) {
      try {
        const stored = getRelationshipStorage().getString(key);
        if (stored) {
          cached = JSON.parse(stored);
          if (cached) {
            this.memoryCache.set(key, cached);
          }
        }
      } catch (error) {
        console.error("[RelationshipCache] Error reading from storage:", error);
      }
    }

    // Check if cached data is still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.status;
    }

    // Cache expired or not found
    if (cached) {
      this.delete(instanceId, accountId);
    }

    return null;
  }

  /**
   * Set relationship in cache
   */
  set(instanceId: string, accountId: string, status: RelationshipStatus): void {
    const key = this.getCacheKey(instanceId, accountId);

    const cached: CachedRelationship = {
      accountId,
      status,
      timestamp: Date.now(),
      instanceId,
    };

    // Store in memory cache
    this.memoryCache.set(key, cached);

    // Store in MMKV
    try {
      getRelationshipStorage().set(key, JSON.stringify(cached));
    } catch (error) {
      console.error("[RelationshipCache] Error writing to storage:", error);
    }

    // Enforce cache size limit
    this.evictIfNeeded();
  }

  /**
   * Update specific relationship properties
   */
  update(
    instanceId: string,
    accountId: string,
    updates: Partial<RelationshipStatus>,
  ): void {
    const existing = this.get(instanceId, accountId);
    if (existing) {
      this.set(instanceId, accountId, { ...existing, ...updates });
    }
  }

  /**
   * Delete relationship from cache
   */
  delete(instanceId: string, accountId: string): void {
    const key = this.getCacheKey(instanceId, accountId);
    this.memoryCache.delete(key);
    try {
      getRelationshipStorage().delete(key);
    } catch (error) {
      console.error("[RelationshipCache] Error deleting from storage:", error);
    }
  }

  /**
   * Get multiple relationships at once
   */
  getMultiple(
    instanceId: string,
    accountIds: string[],
  ): Map<string, RelationshipStatus> {
    const results = new Map<string, RelationshipStatus>();

    for (const accountId of accountIds) {
      const status = this.get(instanceId, accountId);
      if (status) {
        results.set(accountId, status);
      }
    }

    return results;
  }

  /**
   * Set multiple relationships at once
   */
  setMultiple(
    instanceId: string,
    relationships: Map<string, RelationshipStatus>,
  ): void {
    for (const [accountId, status] of relationships) {
      this.set(instanceId, accountId, status);
    }
  }

  /**
   * Check if account is blocked (quick lookup)
   */
  isBlocked(instanceId: string, accountId: string): boolean | null {
    const status = this.get(instanceId, accountId);
    return status ? status.blocking : null;
  }

  /**
   * Check if account is muted (quick lookup)
   */
  isMuted(instanceId: string, accountId: string): boolean | null {
    const status = this.get(instanceId, accountId);
    return status ? status.muting : null;
  }

  /**
   * Check if following account (quick lookup)
   */
  isFollowing(instanceId: string, accountId: string): boolean | null {
    const status = this.get(instanceId, accountId);
    return status ? status.following : null;
  }

  /**
   * Get all blocked account IDs for instance
   */
  getBlockedAccounts(instanceId: string): string[] {
    const blocked: string[] = [];

    // Check memory cache
    for (const [key, cached] of this.memoryCache) {
      if (
        cached.instanceId === instanceId &&
        cached.status.blocking &&
        Date.now() - cached.timestamp < this.cacheTTL
      ) {
        blocked.push(cached.accountId);
      }
    }

    return blocked;
  }

  /**
   * Evict old entries if cache is too large
   */
  private evictIfNeeded(): void {
    if (this.memoryCache.size <= this.maxCacheSize) {
      return;
    }

    // Sort by timestamp and remove oldest entries
    const entries = Array.from(this.memoryCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );

    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);

    for (const [key] of toRemove) {
      this.memoryCache.delete(key);
      try {
        getRelationshipStorage().delete(key);
      } catch (error) {
        console.error("[RelationshipCache] Error evicting entry:", error);
      }
    }

    console.info(`[RelationshipCache] Evicted ${toRemove.length} old entries`);
  }

  /**
   * Clear all relationships for instance
   */
  clearInstance(instanceId: string): void {
    // Clear from memory cache
    for (const [key, cached] of this.memoryCache) {
      if (cached.instanceId === instanceId) {
        this.memoryCache.delete(key);
        try {
          getRelationshipStorage().delete(key);
        } catch (error) {
          console.error("[RelationshipCache] Error clearing instance:", error);
        }
      }
    }
  }

  /**
   * Clear all cached relationships
   */
  clearAll(): void {
    this.memoryCache.clear();
    try {
      getRelationshipStorage().clearAll();
    } catch (error) {
      console.error("[RelationshipCache] Error clearing all:", error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    storageSize: number;
    maxSize: number;
  } {
    return {
      memorySize: this.memoryCache.size,
      storageSize: getRelationshipStorage().getAllKeys().length,
      maxSize: this.maxCacheSize,
    };
  }

  /**
   * Preload relationships into memory
   */
  async preload(instanceId: string): Promise<void> {
    try {
      const keys = getRelationshipStorage().getAllKeys();
      const prefix = `${instanceId}_`;

      for (const key of keys) {
        if (key.startsWith(prefix)) {
          const stored = getRelationshipStorage().getString(key);
          if (stored) {
            const cached: CachedRelationship = JSON.parse(stored);
            if (Date.now() - cached.timestamp < this.cacheTTL) {
              this.memoryCache.set(key, cached);
            } else {
              // Delete expired entries
              getRelationshipStorage().delete(key);
            }
          }
        }
      }

      console.info(
        `[RelationshipCache] Preloaded ${this.memoryCache.size} relationships for ${instanceId}`,
      );
    } catch (error) {
      console.error("[RelationshipCache] Error preloading:", error);
    }
  }
}

// Export singleton instance
export const relationshipCache = new RelationshipCache();
