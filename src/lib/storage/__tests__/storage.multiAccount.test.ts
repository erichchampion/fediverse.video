import { storageService } from "../index";
import type { Instance, AuthData } from "@types";

/**
 * Tests for multi-account same-server support
 * Testing composite IDs, duplicate detection, and account management
 */
describe("StorageService - Multi-Account Same-Server", () => {
  beforeEach(async () => {
    await storageService.deleteDatabase();
    await storageService.initialize();
  });

  describe("composite ID management", () => {
    const mockInstance1 = {
      id: "https://mastodon.social@109382926501",
      url: "https://mastodon.social",
      accountId: "109382926501",
      username: "alice",
      displayName: "Alice Wonderland",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: true,
    };

    const mockInstance2 = {
      id: "https://mastodon.social@109382926502",
      url: "https://mastodon.social",
      accountId: "109382926502",
      username: "bob",
      displayName: "Bob Builder",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: false,
    };

    const mockInstance3 = {
      id: "https://pixelfed.social@12345678",
      url: "https://pixelfed.social",
      accountId: "12345678",
      username: "carol",
      displayName: "Carol Photographer",
      domain: "pixelfed.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: false,
    };

    it("should save multiple accounts from the same server", async () => {
      await storageService.saveInstance(mockInstance1);
      await storageService.saveInstance(mockInstance2);

      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(2);
      expect(instances.find((i) => i.id === mockInstance1.id)).toBeDefined();
      expect(instances.find((i) => i.id === mockInstance2.id)).toBeDefined();
    });

    it("should save accounts from different servers", async () => {
      await storageService.saveInstance(mockInstance1);
      await storageService.saveInstance(mockInstance3);

      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(2);
      expect(
        instances.find((i) => i.url === "https://mastodon.social"),
      ).toBeDefined();
      expect(
        instances.find((i) => i.url === "https://pixelfed.social"),
      ).toBeDefined();
    });

    it("should update instance with composite ID", async () => {
      await storageService.saveInstance(mockInstance1);
      const updated = { ...mockInstance1, displayName: "Alice Updated" };
      await storageService.saveInstance(updated);

      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].displayName).toBe("Alice Updated");
    });

    it("should delete specific account without affecting others on same server", async () => {
      await storageService.saveInstance(mockInstance1);
      await storageService.saveInstance(mockInstance2);

      await storageService.deleteInstance(mockInstance1.id);

      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe(mockInstance2.id);
    });
  });

  describe("getAccountsForServer", () => {
    const instance1 = {
      id: "https://mastodon.social@111",
      url: "https://mastodon.social",
      accountId: "111",
      username: "user1",
      displayName: "User 1",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: true,
    };

    const instance2 = {
      id: "https://mastodon.social@222",
      url: "https://mastodon.social",
      accountId: "222",
      username: "user2",
      displayName: "User 2",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: false,
    };

    const instance3 = {
      id: "https://pixelfed.social@333",
      url: "https://pixelfed.social",
      accountId: "333",
      username: "user3",
      displayName: "User 3",
      domain: "pixelfed.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: false,
    };

    beforeEach(async () => {
      await storageService.saveInstance(instance1);
      await storageService.saveInstance(instance2);
      await storageService.saveInstance(instance3);
    });

    it("should return all accounts for a specific server", async () => {
      const accounts = await storageService.getAccountsForServer(
        "https://mastodon.social",
      );
      expect(accounts).toHaveLength(2);
      expect(accounts.every((a) => a.url === "https://mastodon.social")).toBe(
        true,
      );
    });

    it("should return empty array for server with no accounts", async () => {
      const accounts = await storageService.getAccountsForServer(
        "https://nonexistent.social",
      );
      expect(accounts).toHaveLength(0);
    });

    it("should return single account for server with one account", async () => {
      const accounts = await storageService.getAccountsForServer(
        "https://pixelfed.social",
      );
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe(instance3.id);
    });
  });

  describe("accountExists", () => {
    const instance = {
      id: "https://mastodon.social@12345",
      url: "https://mastodon.social",
      accountId: "12345",
      username: "testuser",
      displayName: "Test User",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: true,
    };

    beforeEach(async () => {
      await storageService.saveInstance(instance);
    });

    it("should return true for existing account", async () => {
      const exists = await storageService.accountExists(
        "https://mastodon.social",
        "12345",
      );
      expect(exists).toBe(true);
    });

    it("should return false for non-existent account", async () => {
      const exists = await storageService.accountExists(
        "https://mastodon.social",
        "99999",
      );
      expect(exists).toBe(false);
    });

    it("should return false for non-existent server", async () => {
      const exists = await storageService.accountExists(
        "https://nonexistent.social",
        "12345",
      );
      expect(exists).toBe(false);
    });

    it("should distinguish between accounts on different servers", async () => {
      const exists1 = await storageService.accountExists(
        "https://mastodon.social",
        "12345",
      );
      const exists2 = await storageService.accountExists(
        "https://pixelfed.social",
        "12345",
      );
      expect(exists1).toBe(true);
      expect(exists2).toBe(false);
    });
  });

  describe("auth data with composite IDs", () => {
    const authData1: AuthData = {
      instanceUrl: "https://mastodon.social",
      accountId: "111",
      username: "alice",
      clientId: "client-1",
      clientSecret: "secret-1",
      accessToken: "token-1",
      scopes: ["read", "write"],
    };

    const authData2: AuthData = {
      instanceUrl: "https://mastodon.social",
      accountId: "222",
      username: "bob",
      clientId: "client-2",
      clientSecret: "secret-2",
      accessToken: "token-2",
      scopes: ["read", "write"],
    };

    it("should save auth data with composite ID", async () => {
      const compositeId = "https://mastodon.social@111";
      await storageService.saveAuthData(compositeId, authData1);

      const retrieved = await storageService.getAuthData(compositeId);
      expect(retrieved).toEqual(authData1);
    });

    it("should store separate auth data for different accounts on same server", async () => {
      const compositeId1 = "https://mastodon.social@111";
      const compositeId2 = "https://mastodon.social@222";

      await storageService.saveAuthData(compositeId1, authData1);
      await storageService.saveAuthData(compositeId2, authData2);

      const retrieved1 = await storageService.getAuthData(compositeId1);
      const retrieved2 = await storageService.getAuthData(compositeId2);

      expect(retrieved1?.accountId).toBe("111");
      expect(retrieved1?.username).toBe("alice");
      expect(retrieved2?.accountId).toBe("222");
      expect(retrieved2?.username).toBe("bob");
    });

    it("should delete auth data with composite ID without affecting others", async () => {
      const compositeId1 = "https://mastodon.social@111";
      const compositeId2 = "https://mastodon.social@222";

      await storageService.saveAuthData(compositeId1, authData1);
      await storageService.saveAuthData(compositeId2, authData2);

      await storageService.deleteAuthData(compositeId1);

      const retrieved1 = await storageService.getAuthData(compositeId1);
      const retrieved2 = await storageService.getAuthData(compositeId2);

      expect(retrieved1).toBeNull();
      expect(retrieved2).toEqual(authData2);
    });
  });

  describe("authenticated instances with composite IDs", () => {
    const instance1 = {
      id: "https://mastodon.social@111",
      url: "https://mastodon.social",
      accountId: "111",
      username: "alice",
      displayName: "Alice",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: true,
    };

    const instance2 = {
      id: "https://mastodon.social@222",
      url: "https://mastodon.social",
      accountId: "222",
      username: "bob",
      displayName: "Bob",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: false,
    };

    const authData1: AuthData = {
      instanceUrl: "https://mastodon.social",
      accountId: "111",
      username: "alice",
      clientId: "client-1",
      clientSecret: "secret-1",
      accessToken: "token-1",
      scopes: ["read", "write"],
    };

    it("should return only instances with valid auth data", async () => {
      await storageService.saveInstance(instance1);
      await storageService.saveInstance(instance2);
      await storageService.saveAuthData(instance1.id, authData1);
      // instance2 has no auth data

      const authenticated = await storageService.getAuthenticatedInstances();
      expect(authenticated).toHaveLength(1);
      expect(authenticated[0].id).toBe(instance1.id);
    });
  });

  describe("switch instance with composite IDs", () => {
    const instance1 = {
      id: "https://mastodon.social@111",
      url: "https://mastodon.social",
      accountId: "111",
      username: "alice",
      displayName: "Alice",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: true,
    };

    const instance2 = {
      id: "https://mastodon.social@222",
      url: "https://mastodon.social",
      accountId: "222",
      username: "bob",
      displayName: "Bob",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: false,
    };

    const authData1: AuthData = {
      instanceUrl: "https://mastodon.social",
      accountId: "111",
      username: "alice",
      clientId: "client-1",
      clientSecret: "secret-1",
      accessToken: "token-1",
      scopes: ["read", "write"],
    };

    const authData2: AuthData = {
      instanceUrl: "https://mastodon.social",
      accountId: "222",
      username: "bob",
      clientId: "client-2",
      clientSecret: "secret-2",
      accessToken: "token-2",
      scopes: ["read", "write"],
    };

    beforeEach(async () => {
      await storageService.saveInstance(instance1);
      await storageService.saveInstance(instance2);
      await storageService.saveAuthData(instance1.id, authData1);
      await storageService.saveAuthData(instance2.id, authData2);
    });

    it("should switch between accounts on the same server", async () => {
      const switched = await storageService.switchInstance(instance2.id);
      expect(switched?.id).toBe(instance2.id);

      const active = await storageService.getActiveInstance();
      expect(active?.id).toBe(instance2.id);
    });

    it("should update isActive flag when switching", async () => {
      await storageService.switchInstance(instance2.id);

      const instances = await storageService.getInstances();
      const inst1 = instances.find((i) => i.id === instance1.id);
      const inst2 = instances.find((i) => i.id === instance2.id);

      expect(inst1?.isActive).toBe(false);
      expect(inst2?.isActive).toBe(true);
    });

    it("should throw error when switching to non-existent account", async () => {
      await expect(
        storageService.switchInstance("https://mastodon.social@999"),
      ).rejects.toThrow("Instance not found");
    });
  });
});
