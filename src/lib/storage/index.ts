import { MMKV } from "react-native-mmkv";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Instance, AuthData, Post } from "@types";
import { CACHE_VERSION, CACHE_EXPIRATION } from "./constants";
import { migrateToMultiAccountSameServer } from "./migrations";

/**
 * Storage Service using MMKV for fast key-value storage
 * and SecureStore for sensitive data (tokens)
 * Phase 1.1: Storage Layer Implementation
 */

// AsyncStorage fallback wrapper that implements MMKV-like interface
class AsyncStorageFallback {
  private prefix: string;

  constructor(id: string) {
    this.prefix = `mmkv_${id}_`;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set(key: string, value: string): void {
    // For MMKV compatibility, set is synchronous
    // But AsyncStorage is async, so we fire and forget
    // For proper async handling, use setAsync
    AsyncStorage.setItem(this.getKey(key), value).catch((err) => {
      console.error(`[AsyncStorageFallback] Error setting ${key}:`, err);
    });
  }

  async setAsync(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getKey(key), value);
    } catch (error) {
      console.error(`[AsyncStorageFallback] Error setting ${key}:`, error);
      throw error;
    }
  }

  getString(key: string): string | undefined {
    // AsyncStorage is async, but MMKV is sync
    // This method should not be called directly - use getStringAsync instead
    // Returning undefined for sync compatibility
    console.warn(
      "[AsyncStorageFallback] getString called synchronously - this will return undefined. Use getStringAsync instead.",
    );
    return undefined;
  }

  async getStringAsync(key: string): Promise<string | undefined> {
    try {
      const value = await AsyncStorage.getItem(this.getKey(key));
      return value ?? undefined;
    } catch (error) {
      console.error(`[AsyncStorageFallback] Error getting ${key}:`, error);
      return undefined;
    }
  }

  getNumber(key: string): number | undefined {
    // Sync fallback - return undefined, use async version
    return undefined;
  }

  async getNumberAsync(key: string): Promise<number | undefined> {
    try {
      const value = await AsyncStorage.getItem(this.getKey(key));
      return value ? Number(value) : undefined;
    } catch (error) {
      console.error(
        `[AsyncStorageFallback] Error getting number ${key}:`,
        error,
      );
      return undefined;
    }
  }

  delete(key: string): void {
    // For MMKV compatibility, delete is synchronous
    // But AsyncStorage is async, so we fire and forget
    AsyncStorage.removeItem(this.getKey(key)).catch((err) => {
      console.error(`[AsyncStorageFallback] Error deleting ${key}:`, err);
    });
  }

  async deleteAsync(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error(`[AsyncStorageFallback] Error deleting ${key}:`, error);
      throw error;
    }
  }

  clearAll(): void {
    AsyncStorage.getAllKeys()
      .then((keys) => {
        const relevantKeys = keys.filter((k) => k.startsWith(this.prefix));
        return AsyncStorage.multiRemove(relevantKeys);
      })
      .catch((err) => {
        console.error(`[AsyncStorageFallback] Error clearing all:`, err);
      });
  }

  async getAllKeysAsync(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys
        .filter((k) => k.startsWith(this.prefix))
        .map((k) => k.substring(this.prefix.length));
    } catch (error) {
      console.error(`[AsyncStorageFallback] Error getting all keys:`, error);
      return [];
    }
  }

  getAllKeys(): string[] {
    // AsyncStorage is async, but MMKV is sync
    // This method should not be called directly - use getAllKeysAsync instead
    console.warn(
      "[AsyncStorageFallback] getAllKeys called synchronously - this will return empty array. Use getAllKeysAsync instead.",
    );
    return [];
  }
}

// Storage interface that can be either MMKV or AsyncStorage fallback
type StorageBackend = MMKV | AsyncStorageFallback;

// Lazy MMKV initialization with AsyncStorage fallback
// MMKV requires JSI which may not be available in remote debugging
let generalStorage: StorageBackend | null = null;
let cacheStorage: StorageBackend | null = null;
let preferencesStorage: StorageBackend | null = null;
let useMMKV = true; // Track if MMKV is available

function getGeneralStorage(): StorageBackend {
  if (!generalStorage) {
    try {
      generalStorage = new MMKV({ id: "general" });
      useMMKV = true;
    } catch (error) {
      // MMKV not available when remote debugging is enabled - this is expected
      // Fallback to AsyncStorage is working correctly
      if (__DEV__) {
        console.debug(
          "MMKV initialization failed, using AsyncStorage fallback (expected when remote debugging is enabled)",
        );
      }
      generalStorage = new AsyncStorageFallback("general");
      useMMKV = false;
    }
  }
  return generalStorage;
}

function getCacheStorage(): StorageBackend {
  if (!cacheStorage) {
    try {
      cacheStorage = new MMKV({ id: "cache" });
    } catch (error) {
      // MMKV not available when remote debugging is enabled - this is expected
      // Fallback to AsyncStorage is working correctly
      if (__DEV__) {
        console.debug(
          "MMKV cache initialization failed, using AsyncStorage fallback (expected when remote debugging is enabled)",
        );
      }
      cacheStorage = new AsyncStorageFallback("cache");
    }
  }
  return cacheStorage;
}

function getPreferencesStorage(): StorageBackend {
  if (!preferencesStorage) {
    try {
      preferencesStorage = new MMKV({ id: "preferences" });
    } catch (error) {
      // MMKV not available when remote debugging is enabled - this is expected
      // Fallback to AsyncStorage is working correctly
      if (__DEV__) {
        console.debug(
          "MMKV preferences initialization failed, using AsyncStorage fallback (expected when remote debugging is enabled)",
        );
      }
      preferencesStorage = new AsyncStorageFallback("preferences");
    }
  }
  return preferencesStorage;
}

// Helper to check if storage is MMKV (works even if MMKV class isn't available)
function isMMKV(storage: StorageBackend): storage is MMKV {
  // Check for MMKV-specific methods that AsyncStorageFallback doesn't have
  return (
    typeof (storage as any).getString === "function" &&
    typeof (storage as any).getNumber === "function" &&
    typeof (storage as any).getAllKeys === "function" &&
    !("getStringAsync" in storage)
  );
}

// Helper to get value from storage (handles both sync MMKV and async fallback)
async function getStorageValue(
  storage: StorageBackend,
  key: string,
): Promise<string | undefined> {
  if (isMMKV(storage)) {
    return storage.getString(key);
  } else {
    return (storage as AsyncStorageFallback).getStringAsync(key);
  }
}

// Helper to get number from storage
async function getStorageNumber(
  storage: StorageBackend,
  key: string,
): Promise<number | undefined> {
  if (isMMKV(storage)) {
    return storage.getNumber(key);
  } else {
    return (storage as AsyncStorageFallback).getNumberAsync(key);
  }
}

// Helper to get all keys from storage
async function getStorageAllKeys(storage: StorageBackend): Promise<string[]> {
  if (isMMKV(storage)) {
    return storage.getAllKeys();
  } else {
    return (storage as AsyncStorageFallback).getAllKeysAsync();
  }
}

/**
 * IndexedDB wrapper for web platform
 * Provides secure storage using IndexedDB instead of localStorage
 */
class IndexedDBStorage {
  private dbName = "MastodonSecureStore";
  private storeName = "secure_data";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result ?? null);
        };

        request.onerror = () => {
          reject(new Error("Failed to read from IndexedDB"));
        };
      });
    } catch (error) {
      console.error("Error reading from IndexedDB:", error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error("Failed to write to IndexedDB"));
        };
      });
    } catch (error) {
      console.error("Error writing to IndexedDB:", error);
      throw error;
    }
  }

  async deleteItem(key: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error("Failed to delete from IndexedDB"));
        };
      });
    } catch (error) {
      console.error("Error deleting from IndexedDB:", error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result as string[]);
        };

        request.onerror = () => {
          reject(new Error("Failed to get keys from IndexedDB"));
        };
      });
    } catch (error) {
      console.error("Error getting keys from IndexedDB:", error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error("Failed to clear IndexedDB"));
        };
      });
    } catch (error) {
      console.error("Error clearing IndexedDB:", error);
      throw error;
    }
  }
}

// Create singleton instance for web
const indexedDBStorage = Platform.OS === "web" ? new IndexedDBStorage() : null;

/**
 * Platform-aware secure storage wrapper
 * Uses expo-secure-store on native platforms and IndexedDB on web
 */
const secureStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === "web" && indexedDBStorage) {
      return indexedDBStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === "web" && indexedDBStorage) {
      return indexedDBStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },

  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === "web" && indexedDBStorage) {
      return indexedDBStorage.deleteItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// Storage keys
export const KEYS = {
  ACTIVE_INSTANCE: "active_instance",
  INSTANCES: "instances",
  CACHE_VERSION: "cache_version",
  MIGRATION_VERSION: "migration_version",
} as const;

// SecureStore keys (for sensitive data)
const SECURE_KEYS = {
  AUTH_PREFIX: "auth_",
} as const;

/**
 * Sanitize instance ID to be safe for SecureStore keys
 * SecureStore only allows alphanumeric characters, ".", "-", and "_"
 */
function sanitizeInstanceId(instanceId: string): string {
  return instanceId
    .replace(/https?:\/\//g, "") // Remove protocol
    .replace(/\//g, "_") // Replace slashes with underscores
    .replace(/:/g, "_") // Replace colons with underscores
    .replace(/@/g, "_"); // Replace @ with underscores (for composite IDs)
}

/**
 * Generate composite instance ID from URL and account ID
 * Format: "${instanceUrl}@${accountId}"
 */
function generateInstanceId(instanceUrl: string, accountId: string): string {
  return `${instanceUrl}@${accountId}`;
}

/**
 * Parse composite instance ID into components
 * Returns null if ID doesn't contain account separator
 * Currently unused but kept for future use
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function parseInstanceId(
  compositeId: string,
): { url: string; accountId: string } | null {
  const atIndex = compositeId.lastIndexOf("@");
  if (atIndex === -1) return null;

  const url = compositeId.substring(0, atIndex);
  const accountId = compositeId.substring(atIndex + 1);

  return { url, accountId };
}

/**
 * Storage Service Interface
 */
export class StorageService {
  private initialized = false;

  /**
   * Initialize storage - check version and migrate if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const storage = getGeneralStorage();
      const currentVersion = await getStorageNumber(
        storage,
        KEYS.CACHE_VERSION,
      );

      if (!currentVersion || currentVersion < CACHE_VERSION) {
        console.info("Migrating storage to version", CACHE_VERSION);
        await this.migrate(currentVersion || 0);
        storage.set(KEYS.CACHE_VERSION, String(CACHE_VERSION));
      }

      // Run multi-account same-server migration if needed
      const migrationVersion =
        (await getStorageNumber(storage, KEYS.MIGRATION_VERSION)) || 0;
      if (migrationVersion < 1) {
        console.info("Running multi-account same-server migration...");
        // Use dynamic import to avoid circular dependency
        // In test environment, use require to avoid --experimental-vm-modules requirement
        let createMastodonClient;
        if (process.env.NODE_ENV === "test") {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          createMastodonClient =
            require("@lib/api/client").createMastodonClient;
        } else {
          const module = await import("@lib/api/client");
          createMastodonClient = module.createMastodonClient;
        }
        await migrateToMultiAccountSameServer(this, createMastodonClient);
        storage.set(KEYS.MIGRATION_VERSION, "1");
      }

      this.initialized = true;
      console.info("Storage initialized successfully");
    } catch (error) {
      console.error("Error initializing storage:", error);
      throw error;
    }
  }

  /**
   * Migrate storage between versions
   */
  private async migrate(fromVersion: number): Promise<void> {
    // Future migrations will go here
    // Example: if (fromVersion < 2) { /* migrate from v1 to v2 */ }
    console.info(`Migrating from version ${fromVersion} to ${CACHE_VERSION}`);
  }

  // ========================================
  // Instance Management
  // ========================================

  /**
   * Get all instances
   */
  async getInstances(): Promise<Instance[]> {
    try {
      const storage = getGeneralStorage();
      const json = await getStorageValue(storage, KEYS.INSTANCES);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error("Error getting instances:", error);
      return [];
    }
  }

  /**
   * Save instance
   */
  async saveInstance(instance: Instance): Promise<void> {
    try {
      const instances = await this.getInstances();
      const index = instances.findIndex((i) => i.id === instance.id);

      if (index >= 0) {
        instances[index] = instance;
      } else {
        instances.push(instance);
      }

      getGeneralStorage().set(KEYS.INSTANCES, JSON.stringify(instances));
    } catch (error) {
      console.error("Error saving instance:", error);
      throw error;
    }
  }

  /**
   * Save multiple instances
   */
  async saveInstances(instances: Instance[]): Promise<void> {
    try {
      getGeneralStorage().set(KEYS.INSTANCES, JSON.stringify(instances));
    } catch (error) {
      console.error("Error saving instances:", error);
      throw error;
    }
  }

  /**
   * Delete instance
   */
  async deleteInstance(instanceId: string): Promise<void> {
    try {
      const instances = await this.getInstances();
      const filtered = instances.filter((i) => i.id !== instanceId);
      getGeneralStorage().set(KEYS.INSTANCES, JSON.stringify(filtered));

      // Also delete auth data
      await this.deleteAuthData(instanceId);
    } catch (error) {
      console.error("Error deleting instance:", error);
      throw error;
    }
  }

  /**
   * Get active instance
   */
  async getActiveInstance(): Promise<Instance | null> {
    try {
      const storage = getGeneralStorage();
      const json = await getStorageValue(storage, KEYS.ACTIVE_INSTANCE);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error("Error getting active instance:", error);
      return null;
    }
  }

  /**
   * Set active instance
   */
  async setActiveInstance(instance: Instance | null): Promise<void> {
    try {
      if (instance) {
        getGeneralStorage().set(KEYS.ACTIVE_INSTANCE, JSON.stringify(instance));
      } else {
        getGeneralStorage().delete(KEYS.ACTIVE_INSTANCE);
      }
    } catch (error) {
      console.error("Error setting active instance:", error);
      throw error;
    }
  }

  // ========================================
  // Authentication (Secure Storage)
  // ========================================

  /**
   * Get auth data for instance (from secure storage)
   */
  async getAuthData(instanceId: string): Promise<AuthData | null> {
    try {
      const sanitizedId = sanitizeInstanceId(instanceId);
      const key = `${SECURE_KEYS.AUTH_PREFIX}${sanitizedId}`;
      const json = await secureStorage.getItemAsync(key);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error("Error getting auth data:", error);
      return null;
    }
  }

  /**
   * Save auth data for instance (to secure storage)
   */
  async saveAuthData(instanceId: string, authData: AuthData): Promise<void> {
    try {
      const sanitizedId = sanitizeInstanceId(instanceId);
      const key = `${SECURE_KEYS.AUTH_PREFIX}${sanitizedId}`;
      await secureStorage.setItemAsync(key, JSON.stringify(authData));
    } catch (error) {
      console.error("Error saving auth data:", error);
      throw error;
    }
  }

  /**
   * Delete auth data for instance
   */
  async deleteAuthData(instanceId: string): Promise<void> {
    try {
      const sanitizedId = sanitizeInstanceId(instanceId);
      const key = `${SECURE_KEYS.AUTH_PREFIX}${sanitizedId}`;
      await secureStorage.deleteItemAsync(key);
    } catch (error) {
      console.error("Error deleting auth data:", error);
      throw error;
    }
  }

  // ========================================
  // Posts Cache
  // ========================================

  /**
   * Get cached posts for feed
   */
  async getCachedPosts(feedKey: string): Promise<Post[]> {
    try {
      const storage = getCacheStorage();
      const json = await getStorageValue(storage, `posts_${feedKey}`);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error("Error getting cached posts:", error);
      return [];
    }
  }

  /**
   * Save posts to cache
   */
  async saveCachedPosts(feedKey: string, posts: Post[]): Promise<void> {
    try {
      const storage = getCacheStorage();
      if (isMMKV(storage)) {
        // MMKV is synchronous
        storage.set(`posts_${feedKey}`, JSON.stringify(posts));
        storage.set(`posts_${feedKey}_timestamp`, Date.now());
      } else {
        // AsyncStorage is asynchronous
        const fallback = storage as AsyncStorageFallback;
        await fallback.setAsync(`posts_${feedKey}`, JSON.stringify(posts));
        await fallback.setAsync(
          `posts_${feedKey}_timestamp`,
          String(Date.now()),
        );
      }
    } catch (error) {
      console.error("Error saving cached posts:", error);
      throw error;
    }
  }

  /**
   * Check if cache is valid (not expired)
   */
  async isCacheValid(
    feedKey: string,
    maxAge: number = CACHE_EXPIRATION.FEED,
  ): Promise<boolean> {
    try {
      const storage = getCacheStorage();
      const timestamp = await getStorageNumber(
        storage,
        `posts_${feedKey}_timestamp`,
      );
      if (!timestamp) return false;
      return Date.now() - timestamp < maxAge;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache for specific feed
   */
  async clearFeedCache(feedKey: string): Promise<void> {
    try {
      getCacheStorage().delete(`posts_${feedKey}`);
      getCacheStorage().delete(`posts_${feedKey}_timestamp`);
    } catch (error) {
      console.error("Error clearing feed cache:", error);
    }
  }

  /**
   * Clear all cached posts
   */
  async clearAllCache(): Promise<void> {
    try {
      getCacheStorage().clearAll();
    } catch (error) {
      console.error("Error clearing all cache:", error);
      throw error;
    }
  }

  // ========================================
  // User Preferences
  // ========================================

  /**
   * Get preference for instance
   */
  async getPreference(instanceId: string, key: string): Promise<any> {
    try {
      const storage = getPreferencesStorage();
      const prefKey = `${instanceId}_${key}`;
      const value = await getStorageValue(storage, prefKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Error getting preference:", error);
      return null;
    }
  }

  /**
   * Set preference for instance
   */
  async setPreference(
    instanceId: string,
    key: string,
    value: any,
  ): Promise<void> {
    try {
      const prefKey = `${instanceId}_${key}`;
      getPreferencesStorage().set(prefKey, JSON.stringify(value));
    } catch (error) {
      console.error("Error setting preference:", error);
      throw error;
    }
  }

  /**
   * Delete preference
   */
  async deletePreference(instanceId: string, key: string): Promise<void> {
    try {
      const prefKey = `${instanceId}_${key}`;
      getPreferencesStorage().delete(prefKey);
    } catch (error) {
      console.error("Error deleting preference:", error);
    }
  }

  /**
   * Get all preferences for instance
   */
  async getAllPreferences(instanceId: string): Promise<Record<string, any>> {
    try {
      const storage = getPreferencesStorage();
      const prefix = `${instanceId}_`;
      const allKeys = await getStorageAllKeys(storage);
      const keys = allKeys.filter((k) => k.startsWith(prefix));
      const prefs: Record<string, any> = {};

      for (const key of keys) {
        const prefKey = key.substring(prefix.length);
        const value = await getStorageValue(storage, key);
        if (value) {
          try {
            prefs[prefKey] = JSON.parse(value);
          } catch {
            prefs[prefKey] = value;
          }
        }
      }

      return prefs;
    } catch (error) {
      console.error("Error getting all preferences:", error);
      return {};
    }
  }

  // ========================================
  // Multi-Account Support
  // ========================================

  /**
   * Get all instances with auth data
   * Returns instances that have valid authentication
   */
  async getAuthenticatedInstances(): Promise<Instance[]> {
    try {
      const instances = await this.getInstances();
      const authenticatedInstances: Instance[] = [];

      for (const instance of instances) {
        const authData = await this.getAuthData(instance.id);
        if (authData && authData.accessToken) {
          authenticatedInstances.push(instance);
        }
      }

      return authenticatedInstances;
    } catch (error) {
      console.error("Error getting authenticated instances:", error);
      return [];
    }
  }

  /**
   * Switch active instance
   */
  async switchInstance(instanceId: string): Promise<Instance | null> {
    try {
      const instances = await this.getInstances();
      const instance = instances.find((i) => i.id === instanceId);

      if (!instance) {
        throw new Error("Instance not found");
      }

      // Check if instance has auth data
      const authData = await this.getAuthData(instanceId);
      if (!authData) {
        throw new Error("Instance has no authentication data");
      }

      // Update last accessed time
      instance.lastAccessed = Date.now();
      instance.isActive = true;

      // Mark other instances as inactive
      const updatedInstances = instances.map((i) => ({
        ...i,
        isActive: i.id === instanceId,
      }));

      getGeneralStorage().set(KEYS.INSTANCES, JSON.stringify(updatedInstances));
      await this.setActiveInstance(instance);

      return instance;
    } catch (error) {
      console.error("Error switching instance:", error);
      throw error;
    }
  }

  /**
   * Get all accounts for a specific server
   * Multi-account same-server support
   */
  async getAccountsForServer(serverUrl: string): Promise<Instance[]> {
    try {
      const instances = await this.getInstances();
      return instances.filter((i) => i.url === serverUrl);
    } catch (error) {
      console.error("Error getting accounts for server:", error);
      return [];
    }
  }

  /**
   * Check if account already exists
   * Multi-account same-server support
   */
  async accountExists(serverUrl: string, accountId: string): Promise<boolean> {
    try {
      const instances = await this.getInstances();
      const compositeId = generateInstanceId(serverUrl, accountId);
      return instances.some((i) => i.id === compositeId);
    } catch (error) {
      console.error("Error checking if account exists:", error);
      return false;
    }
  }

  // ========================================
  // Utilities
  // ========================================

  /**
   * Delete entire database (for testing/reset)
   */
  async deleteDatabase(): Promise<void> {
    try {
      // Clear all MMKV storage
      getGeneralStorage().clearAll();
      getCacheStorage().clearAll();
      getPreferencesStorage().clearAll();

      // Clear all SecureStore/IndexedDB data
      if (Platform.OS === "web" && indexedDBStorage) {
        // Clear IndexedDB
        await indexedDBStorage.clear();
      } else {
        // In production, SecureStore doesn't have clearAll, but in tests we provide __clearAllForTesting
        if ((SecureStore as any).__clearAllForTesting) {
          (SecureStore as any).__clearAllForTesting();
        }
      }

      this.initialized = false;
      console.info("Database cleared successfully");
    } catch (error) {
      console.error("Error deleting database:", error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    generalKeys: number;
    cacheKeys: number;
    preferenceKeys: number;
  }> {
    return {
      generalKeys: (await getStorageAllKeys(getGeneralStorage())).length,
      cacheKeys: (await getStorageAllKeys(getCacheStorage())).length,
      preferenceKeys: (await getStorageAllKeys(getPreferencesStorage())).length,
    };
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Export relationship cache
export { relationshipCache } from "./relationshipCache";
export type { RelationshipStatus } from "./relationshipCache";
