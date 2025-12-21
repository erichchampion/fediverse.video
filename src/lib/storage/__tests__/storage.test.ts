import { storageService } from "../index";

describe("StorageService", () => {
  beforeEach(async () => {
    // Clear storage before each test
    await storageService.deleteDatabase();
    await storageService.initialize();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await expect(storageService.initialize()).resolves.not.toThrow();
    });

    it("should handle multiple initialization calls", async () => {
      await storageService.initialize();
      await storageService.initialize();
      // Should not throw
    });
  });

  describe("instance management", () => {
    const mockInstance = {
      id: "https://mastodon.social@123456",
      url: "https://mastodon.social",
      accountId: "123456",
      username: "testuser",
      displayName: "Mastodon Social",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: true,
    };

    it("should save and retrieve instance", async () => {
      await storageService.saveInstance(mockInstance);
      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0]).toEqual(mockInstance);
    });

    it("should update existing instance", async () => {
      await storageService.saveInstance(mockInstance);
      const updated = { ...mockInstance, displayName: "Updated Name" };
      await storageService.saveInstance(updated);

      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].displayName).toBe("Updated Name");
    });

    it("should delete instance", async () => {
      await storageService.saveInstance(mockInstance);
      await storageService.deleteInstance(mockInstance.id);
      const instances = await storageService.getInstances();
      expect(instances).toHaveLength(0);
    });

    it("should set and get active instance", async () => {
      await storageService.setActiveInstance(mockInstance);
      const active = await storageService.getActiveInstance();
      expect(active).toEqual(mockInstance);
    });

    it("should clear active instance", async () => {
      await storageService.setActiveInstance(mockInstance);
      await storageService.setActiveInstance(null);
      const active = await storageService.getActiveInstance();
      expect(active).toBeNull();
    });
  });

  describe("authentication", () => {
    const mockAuthData = {
      instanceUrl: "https://mastodon.social",
      accountId: "123456",
      username: "testuser",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      accessToken: "test-access-token",
      scopes: ["read", "write"],
    };

    it("should save and retrieve auth data", async () => {
      await storageService.saveAuthData(
        "https://mastodon.social",
        mockAuthData,
      );
      const authData = await storageService.getAuthData(
        "https://mastodon.social",
      );
      expect(authData).toEqual(mockAuthData);
    });

    it("should delete auth data", async () => {
      await storageService.saveAuthData(
        "https://mastodon.social",
        mockAuthData,
      );
      await storageService.deleteAuthData("https://mastodon.social");
      const authData = await storageService.getAuthData(
        "https://mastodon.social",
      );
      expect(authData).toBeNull();
    });

    it("should return null for non-existent auth data", async () => {
      const authData = await storageService.getAuthData(
        "https://nonexistent.com",
      );
      expect(authData).toBeNull();
    });
  });

  describe("post cache", () => {
    const mockPosts = [
      {
        id: "1",
        uri: "https://mastodon.social/users/user1/statuses/1",
        content: "Test post 1",
        createdAt: new Date().toISOString(),
        account: {
          id: "1",
          username: "user1",
          displayName: "User 1",
          avatar: "https://example.com/avatar1.jpg",
          header: "",
          followersCount: 0,
          followingCount: 0,
          statusesCount: 0,
        },
        mediaAttachments: [],
        mentions: [],
        tags: [],
        emojis: [],
        favouritesCount: 0,
        reblogsCount: 0,
        repliesCount: 0,
        favourited: false,
        reblogged: false,
        bookmarked: false,
        sensitive: false,
        spoilerText: "",
        visibility: "public" as const,
      },
    ];

    it("should save and retrieve cached posts", async () => {
      await storageService.saveCachedPosts("home_feed", mockPosts);
      const cached = await storageService.getCachedPosts("home_feed");
      expect(cached).toEqual(mockPosts);
    });

    it("should check cache validity", async () => {
      await storageService.saveCachedPosts("home_feed", mockPosts);
      expect(await storageService.isCacheValid("home_feed", 60000)).toBe(true);
    });

    it("should detect expired cache", async () => {
      await storageService.saveCachedPosts("home_feed", mockPosts);
      // Check with 0ms maxAge - should be expired
      expect(await storageService.isCacheValid("home_feed", 0)).toBe(false);
    });

    it("should clear specific feed cache", async () => {
      await storageService.saveCachedPosts("home_feed", mockPosts);
      await storageService.clearFeedCache("home_feed");
      const cached = await storageService.getCachedPosts("home_feed");
      expect(cached).toEqual([]);
    });

    it("should clear all cache", async () => {
      await storageService.saveCachedPosts("home_feed", mockPosts);
      await storageService.saveCachedPosts("public_feed", mockPosts);
      await storageService.clearAllCache();

      const home = await storageService.getCachedPosts("home_feed");
      const pub = await storageService.getCachedPosts("public_feed");
      expect(home).toEqual([]);
      expect(pub).toEqual([]);
    });
  });

  describe("preferences", () => {
    it("should save and retrieve preference", async () => {
      await storageService.setPreference(
        "https://mastodon.social",
        "theme",
        "dark",
      );
      const theme = await storageService.getPreference(
        "https://mastodon.social",
        "theme",
      );
      expect(theme).toBe("dark");
    });

    it("should handle complex preference values", async () => {
      const complexValue = { gridView: true, pageSize: 20 };
      await storageService.setPreference(
        "https://mastodon.social",
        "feedSettings",
        complexValue,
      );
      const value = await storageService.getPreference(
        "https://mastodon.social",
        "feedSettings",
      );
      expect(value).toEqual(complexValue);
    });

    it("should delete preference", async () => {
      await storageService.setPreference(
        "https://mastodon.social",
        "theme",
        "dark",
      );
      await storageService.deletePreference("https://mastodon.social", "theme");
      const theme = await storageService.getPreference(
        "https://mastodon.social",
        "theme",
      );
      expect(theme).toBeNull();
    });

    it("should get all preferences for instance", async () => {
      await storageService.setPreference(
        "https://mastodon.social",
        "theme",
        "dark",
      );
      await storageService.setPreference(
        "https://mastodon.social",
        "gridView",
        true,
      );

      const prefs = await storageService.getAllPreferences(
        "https://mastodon.social",
      );
      expect(prefs).toEqual({
        theme: "dark",
        gridView: true,
      });
    });
  });

  describe("utilities", () => {
    it("should get storage stats", async () => {
      const stats = await storageService.getStats();
      expect(stats).toHaveProperty("generalKeys");
      expect(stats).toHaveProperty("cacheKeys");
      expect(stats).toHaveProperty("preferenceKeys");
    });

    it("should delete entire database", async () => {
      const mockInstance = {
        id: "https://mastodon.social@123456",
        url: "https://mastodon.social",
        accountId: "123456",
        username: "testuser",
        displayName: "Mastodon Social",
        domain: "mastodon.social",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: true,
      };

      await storageService.saveInstance(mockInstance);
      await storageService.setPreference(
        "https://mastodon.social",
        "theme",
        "dark",
      );

      await storageService.deleteDatabase();

      const instances = await storageService.getInstances();
      const stats = await storageService.getStats();

      expect(instances).toEqual([]);
      expect(stats.generalKeys).toBe(0);
    });
  });
});
