import { storageService } from "../index";
import { migrateToMultiAccountSameServer, needsMigration } from "../migrations";
import type { Instance, AuthData } from "@types";

// Mock the API client
const mockCreateMastodonClient = jest.fn((url: string, token: string) => ({
  v1: {
    accounts: {
      verifyCredentials: jest.fn().mockResolvedValue({
        id: "109382926501",
        username: "testuser",
        displayName: "Test User",
        avatar: "https://example.com/avatar.jpg",
      }),
    },
  },
}));

jest.mock("@lib/api/client", () => ({
  createMastodonClient: mockCreateMastodonClient,
}));

/**
 * Tests for migration from old format to composite ID format
 * Old format: instance.id = "https://mastodon.social"
 * New format: instance.id = "https://mastodon.social@109382926501"
 */
describe("Storage Migration - Multi-Account Same-Server", () => {
  beforeEach(async () => {
    await storageService.deleteDatabase();
    // Don't initialize to avoid running migrations automatically
  });

  describe("needsMigration", () => {
    it("should return false when there are no instances", async () => {
      await storageService.initialize();
      const needs = await needsMigration(storageService);
      expect(needs).toBe(false);
    });

    it("should return true for old format instances", async () => {
      // Manually save old format instance (without composite ID)
      const oldInstance = {
        id: "https://mastodon.social",
        url: "https://mastodon.social",
        accountId: "", // Old format doesn't have this
        username: "", // Old format doesn't have this
        displayName: "Mastodon Social",
        domain: "mastodon.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: true,
      };

      await storageService.initialize();
      await storageService.saveInstance(oldInstance);

      const needs = await needsMigration(storageService);
      expect(needs).toBe(true);
    });

    it("should return false for new format instances", async () => {
      const newInstance = {
        id: "https://mastodon.social@109382926501",
        url: "https://mastodon.social",
        accountId: "109382926501",
        username: "testuser",
        displayName: "Test User",
        domain: "mastodon.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: true,
      };

      await storageService.initialize();
      await storageService.saveInstance(newInstance);

      const needs = await needsMigration(storageService);
      expect(needs).toBe(false);
    });
  });

  describe("migrateToMultiAccountSameServer", () => {
    it("should migrate instance from old to new format", async () => {
      // Setup old format instance
      const oldInstance = {
        id: "https://mastodon.social",
        url: "https://mastodon.social",
        accountId: "",
        username: "",
        displayName: "Mastodon Social",
        domain: "mastodon.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: true,
      };

      const oldAuthData: AuthData = {
        instanceUrl: "https://mastodon.social",
        accountId: "",
        username: "",
        clientId: "test-client",
        clientSecret: "test-secret",
        accessToken: "test-token",
        scopes: ["read", "write"],
      };

      await storageService.initialize();
      await storageService.saveInstance(oldInstance);
      await storageService.saveAuthData(oldInstance.id, oldAuthData);

      // Run migration
      await migrateToMultiAccountSameServer(
        storageService,
        mockCreateMastodonClient,
      );

      // Verify migration results
      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(1);

      const migratedInstance = instances[0];
      expect(migratedInstance.id).toBe("https://mastodon.social@109382926501");
      expect(migratedInstance.accountId).toBe("109382926501");
      expect(migratedInstance.username).toBe("testuser");
      expect(migratedInstance.url).toBe("https://mastodon.social");

      // Verify auth data was migrated
      const newAuthData = await storageService.getAuthData(migratedInstance.id);
      expect(newAuthData).not.toBeNull();
      expect(newAuthData?.accountId).toBe("109382926501");
      expect(newAuthData?.username).toBe("testuser");
      expect(newAuthData?.accessToken).toBe("test-token");

      // Verify old auth data was deleted
      const oldAuth = await storageService.getAuthData(oldInstance.id);
      expect(oldAuth).toBeNull();
    });

    it("should handle multiple instances during migration", async () => {
      const instance1 = {
        id: "https://mastodon.social",
        url: "https://mastodon.social",
        accountId: "",
        username: "",
        displayName: "Mastodon Social",
        domain: "mastodon.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: true,
      };

      const instance2 = {
        id: "https://pixelfed.social",
        url: "https://pixelfed.social",
        accountId: "",
        username: "",
        displayName: "Pixelfed Social",
        domain: "pixelfed.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: false,
      };

      const authData: AuthData = {
        instanceUrl: "https://mastodon.social",
        accountId: "",
        username: "",
        clientId: "test-client",
        clientSecret: "test-secret",
        accessToken: "test-token",
        scopes: ["read", "write"],
      };

      await storageService.initialize();
      await storageService.saveInstance(instance1);
      await storageService.saveInstance(instance2);
      await storageService.saveAuthData(instance1.id, authData);

      await migrateToMultiAccountSameServer(
        storageService,
        mockCreateMastodonClient,
      );

      const instances = await storageService.getInstances();
      expect(instances.length).toBeGreaterThan(0);

      // Check that migrated instances have composite IDs
      const migratedWithAuth = instances.find(
        (i) => i.url === "https://mastodon.social",
      );
      expect(migratedWithAuth?.id).toContain("@");
      expect(migratedWithAuth?.accountId).toBeTruthy();
    });

    it("should preserve active instance during migration", async () => {
      const oldInstance = {
        id: "https://mastodon.social",
        url: "https://mastodon.social",
        accountId: "",
        username: "",
        displayName: "Mastodon Social",
        domain: "mastodon.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: true,
      };

      const authData: AuthData = {
        instanceUrl: "https://mastodon.social",
        accountId: "",
        username: "",
        clientId: "test-client",
        clientSecret: "test-secret",
        accessToken: "test-token",
        scopes: ["read", "write"],
      };

      await storageService.initialize();
      await storageService.saveInstance(oldInstance);
      await storageService.saveAuthData(oldInstance.id, authData);
      await storageService.setActiveInstance(oldInstance);

      await migrateToMultiAccountSameServer(
        storageService,
        mockCreateMastodonClient,
      );

      const activeInstance = await storageService.getActiveInstance();
      expect(activeInstance).not.toBeNull();
      expect(activeInstance?.id).toContain("@");
      expect(activeInstance?.isActive).toBe(true);
    });

    it("should handle instances without auth data gracefully", async () => {
      const instanceWithoutAuth = {
        id: "https://mastodon.social",
        url: "https://mastodon.social",
        accountId: "",
        username: "",
        displayName: "Mastodon Social",
        domain: "mastodon.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: false,
      };

      await storageService.initialize();
      await storageService.saveInstance(instanceWithoutAuth);

      // Should not throw
      await expect(
        migrateToMultiAccountSameServer(
          storageService,
          mockCreateMastodonClient,
        ),
      ).resolves.not.toThrow();

      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(1);
      // Instance without auth should be preserved but not migrated
      expect(instances[0].id).toBe("https://mastodon.social");
    });

    it("should skip already migrated instances", async () => {
      const alreadyMigrated = {
        id: "https://mastodon.social@109382926501",
        url: "https://mastodon.social",
        accountId: "109382926501",
        username: "testuser",
        displayName: "Test User",
        domain: "mastodon.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: true,
      };

      await storageService.initialize();
      await storageService.saveInstance(alreadyMigrated);

      await migrateToMultiAccountSameServer(
        storageService,
        mockCreateMastodonClient,
      );

      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0]).toEqual(alreadyMigrated);
    });

    it("should handle empty database", async () => {
      await storageService.initialize();

      // Should not throw
      await expect(
        migrateToMultiAccountSameServer(
          storageService,
          mockCreateMastodonClient,
        ),
      ).resolves.not.toThrow();

      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(0);
    });
  });

  describe("migration integration with storage initialization", () => {
    it("should run migration automatically on first initialization", async () => {
      // Create old format instance before initialization
      // Use storageService directly to ensure consistency
      const oldInstance = {
        id: "https://mastodon.social",
        url: "https://mastodon.social",
        accountId: "",
        username: "",
        displayName: "Mastodon Social",
        domain: "mastodon.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: true,
      };

      // Manually set instances in MMKV (which is used in test environment)
      // We need to bypass initialization to set up the test state
      const { KEYS } = require("../index");
      const { MMKV } = require("react-native-mmkv");
      const mmkvInstance = new MMKV({ id: "general" });
      mmkvInstance.set(KEYS.INSTANCES, JSON.stringify([oldInstance]));
      // Ensure migration version is not set (or set to 0) so migration runs
      // Don't set MIGRATION_VERSION so needsMigration will return true

      const authData: AuthData = {
        instanceUrl: "https://mastodon.social",
        accountId: "",
        username: "",
        clientId: "test-client",
        clientSecret: "test-secret",
        accessToken: "test-token",
        scopes: ["read", "write"],
      };

      await storageService.saveAuthData(oldInstance.id, authData);

      // Reset initialized flag to allow migration to run
      (storageService as any).initialized = false;

      // Now initialize - should trigger migration
      // The migration should run because MIGRATION_VERSION is not set
      await storageService.initialize();

      const instances = await storageService.getInstances();
      const migratedInstance = instances.find(
        (i) => i.url === "https://mastodon.social",
      );

      expect(migratedInstance?.id).toContain("@");
      expect(migratedInstance?.accountId).toBeTruthy();
    });

    it("should not run migration multiple times", async () => {
      await storageService.initialize();
      await storageService.initialize();
      await storageService.initialize();

      // Should not cause any issues
      const instances = await storageService.getInstances();
      expect(instances).toBeDefined();
    });
  });

  describe("migration error handling", () => {
    it("should handle API errors gracefully", async () => {
      const { createMastodonClient } = require("@lib/api/client");
      createMastodonClient.mockImplementationOnce(() => ({
        v1: {
          accounts: {
            verifyCredentials: jest
              .fn()
              .mockRejectedValue(new Error("API Error")),
          },
        },
      }));

      const oldInstance = {
        id: "https://mastodon.social",
        url: "https://mastodon.social",
        accountId: "",
        username: "",
        displayName: "Mastodon Social",
        domain: "mastodon.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: true,
      };

      const authData: AuthData = {
        instanceUrl: "https://mastodon.social",
        accountId: "",
        username: "",
        clientId: "test-client",
        clientSecret: "test-secret",
        accessToken: "test-token",
        scopes: ["read", "write"],
      };

      await storageService.initialize();
      await storageService.saveInstance(oldInstance);
      await storageService.saveAuthData(oldInstance.id, authData);

      // Should not throw, should preserve old instance
      await expect(
        migrateToMultiAccountSameServer(
          storageService,
          mockCreateMastodonClient,
        ),
      ).resolves.not.toThrow();

      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(1);
      // Instance should be preserved in case of error
      expect(instances[0].id).toBe("https://mastodon.social");
    });
  });
});
