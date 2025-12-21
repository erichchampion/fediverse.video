import type { Instance, AuthData } from "@types";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Use AsyncStorage for migrations to avoid MMKV JSI issues
// This is safe because migrations only run during initialization
async function getStorageValue(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`mmkv_general_${key}`);
  } catch (error) {
    console.error(`[Migrations] Error getting ${key}:`, error);
    return null;
  }
}

async function setStorageValue(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`mmkv_general_${key}`, value);
  } catch (error) {
    console.error(`[Migrations] Error setting ${key}:`, error);
    throw error;
  }
}

/**
 * Storage service interface to avoid circular dependency
 */
interface StorageServiceInterface {
  getInstances(): Promise<Instance[]>;
  getAuthData(instanceId: string): Promise<AuthData | null>;
  saveAuthData(instanceId: string, authData: AuthData): Promise<void>;
  saveInstances(instances: Instance[]): Promise<void>;
  setActiveInstance(instance: Instance | null): Promise<void>;
  deleteAuthData(instanceId: string): Promise<void>;
}

/**
 * Client factory function type to avoid importing from client.ts
 */
type ClientFactory = (instanceUrl: string, accessToken: string) => any;

/**
 * Migration: Update instances to use composite IDs (url@accountId)
 * This enables multiple accounts on the same server
 *
 * Migration Path:
 * - Old format: instance.id = "https://mastodon.social"
 * - New format: instance.id = "https://mastodon.social@109382926501"
 */
export async function migrateToMultiAccountSameServer(
  storageService: StorageServiceInterface,
  createClient: ClientFactory,
): Promise<void> {
  console.info("Starting multi-account same-server migration...");

  try {
    const instances = await storageService.getInstances();

    if (instances.length === 0) {
      console.info("No instances to migrate");
      return;
    }

    const migratedInstances: Instance[] = [];
    let migrationCount = 0;

    for (const oldInstance of instances) {
      // Check if already migrated (has @ in ID after the protocol)
      const urlPart = oldInstance.id.replace(/^https?:\/\//, "");
      if (urlPart.includes("@")) {
        console.info(`Instance ${oldInstance.id} already migrated, skipping`);
        migratedInstances.push(oldInstance);
        continue;
      }

      // Get auth data to fetch account ID
      const authData = await storageService.getAuthData(oldInstance.id);
      if (!authData || !authData.accessToken) {
        console.warn(`No auth data for ${oldInstance.id}, skipping migration`);
        // Keep instance but it won't be usable without auth
        migratedInstances.push(oldInstance);
        continue;
      }

      try {
        // Fetch account details to get account ID
        const client = createClient(oldInstance.url, authData.accessToken);
        const account = await client.v1.accounts.verifyCredentials();

        // Create new instance with composite ID
        const compositeId = `${oldInstance.url}@${account.id}`;
        const newInstance: Instance = {
          ...oldInstance,
          id: compositeId,
          accountId: account.id,
          username: account.username,
        };

        console.info(`Migrating ${oldInstance.id} -> ${compositeId}`);

        // Save instance with new ID (don't use saveInstance to avoid side effects)
        migratedInstances.push(newInstance);

        // Create enhanced auth data with account info
        const newAuthData: AuthData = {
          ...authData,
          accountId: account.id,
          username: account.username,
        };

        // Save auth data with new composite ID
        await storageService.saveAuthData(compositeId, newAuthData);

        // Delete old auth data (different key)
        if (oldInstance.id !== compositeId) {
          await storageService.deleteAuthData(oldInstance.id);
        }

        // Update active instance reference if this was the active one
        if (oldInstance.isActive) {
          await storageService.setActiveInstance(newInstance);
        }

        migrationCount++;
        console.info(`Successfully migrated instance ${oldInstance.id}`);
      } catch (error) {
        console.error(`Failed to migrate instance ${oldInstance.id}:`, error);

        // Keep old instance on error so user doesn't lose access
        // They'll need to re-authenticate, but at least the instance record exists
        migratedInstances.push(oldInstance);
      }
    }

    // Save all migrated instances using storageService to ensure consistency
    await storageService.saveInstances(migratedInstances);

    console.info(
      `Migration completed: ${migrationCount}/${instances.length} instances migrated successfully`,
    );
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Check if migration is needed
 */
export async function needsMigration(
  storageService: StorageServiceInterface,
): Promise<boolean> {
  try {
    const instances = await storageService.getInstances();

    if (instances.length === 0) {
      return false;
    }

    // Check if any instance has old format ID (no @ after protocol)
    return instances.some((instance) => {
      const urlPart = instance.id.replace(/^https?:\/\//, "");
      return !urlPart.includes("@");
    });
  } catch (error) {
    console.error("Error checking migration status:", error);
    return false;
  }
}
