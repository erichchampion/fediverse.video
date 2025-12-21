/**
 * MastodonAPI Client Tests - Profile and Preferences Methods
 * Tests for the new profile update and preferences API methods
 */

import { MastodonAPI, clearClientCache } from "../client";
import { createRestAPIClient } from "masto";

// Mock masto
jest.mock("masto");

// Mock requestQueue module
const mockEnqueue = jest.fn(async (fn) => await fn());
jest.mock("../requestQueue", () => ({
  requestQueue: {
    get enqueue() {
      return mockEnqueue;
    },
  },
  RequestPriority: {
    HIGH: 10,
    NORMAL: 5,
    LOW: 1,
  },
}));

describe("MastodonAPI - Profile and Preferences", () => {
  let api: MastodonAPI;
  let mockClient: any;
  let selectCache: Map<string, any>;

  beforeEach(() => {
    // Clear call history but preserve mock implementations
    mockEnqueue.mockClear();
    (createRestAPIClient as jest.Mock).mockClear();

    // Clear the client cache to ensure fresh clients for each test
    clearClientCache();

    // Cache for $select results to ensure the same object is returned for the same accountId
    selectCache = new Map();

    mockClient = {
      v1: {
        accounts: {
          verifyCredentials: jest.fn(),
          updateCredentials: jest.fn(),
          $select: jest.fn((accountId: string) => {
            if (!selectCache.has(accountId)) {
              selectCache.set(accountId, {
                following: {
                  list: jest.fn(),
                },
                followers: {
                  list: jest.fn(),
                },
              });
            }
            return selectCache.get(accountId);
          }),
        },
        preferences: {
          fetch: jest.fn(),
        },
      },
      v2: {
        media: {
          create: jest.fn(),
        },
      },
    };

    (createRestAPIClient as jest.Mock).mockReturnValue(mockClient);

    api = new MastodonAPI("https://mastodon.social", "test-token");
  });

  describe("verifyCredentials", () => {
    it("should fetch current account credentials", async () => {
      const mockAccount = {
        id: "user123",
        username: "testuser",
        displayName: "Test User",
        avatar: "https://example.com/avatar.jpg",
        header: "https://example.com/header.jpg",
      };

      mockClient.v1.accounts.verifyCredentials.mockResolvedValue(mockAccount);

      const result = await api.verifyCredentials();

      expect(mockClient.v1.accounts.verifyCredentials).toHaveBeenCalled();
      expect(result).toEqual(mockAccount);
    });

    it("should handle errors when fetching credentials", async () => {
      mockClient.v1.accounts.verifyCredentials.mockRejectedValue(
        new Error("Unauthorized"),
      );

      await expect(api.verifyCredentials()).rejects.toThrow("Unauthorized");
    });
  });

  describe("updateCredentials", () => {
    it("should update profile with display name and note", async () => {
      const params = {
        displayName: "New Name",
        note: "New bio",
      };

      const mockUpdatedAccount = {
        id: "user123",
        username: "testuser",
        displayName: "New Name",
        note: "New bio",
      };

      mockClient.v1.accounts.updateCredentials.mockResolvedValue(
        mockUpdatedAccount,
      );

      const result = await api.updateCredentials(params);

      expect(mockClient.v1.accounts.updateCredentials).toHaveBeenCalledWith(
        params,
      );
      expect(result).toEqual(mockUpdatedAccount);
    });

    it("should update locked status", async () => {
      const params = { locked: true };

      mockClient.v1.accounts.updateCredentials.mockResolvedValue({
        id: "user123",
        locked: true,
      });

      const result = await api.updateCredentials(params);

      expect(mockClient.v1.accounts.updateCredentials).toHaveBeenCalledWith(
        params,
      );
      expect(result.locked).toBe(true);
    });

    it("should update bot status", async () => {
      const params = { bot: true };

      mockClient.v1.accounts.updateCredentials.mockResolvedValue({
        id: "user123",
        bot: true,
      });

      const result = await api.updateCredentials(params);

      expect(mockClient.v1.accounts.updateCredentials).toHaveBeenCalledWith(
        params,
      );
      expect(result.bot).toBe(true);
    });

    it("should update discoverable status", async () => {
      const params = { discoverable: false };

      mockClient.v1.accounts.updateCredentials.mockResolvedValue({
        id: "user123",
        discoverable: false,
      });

      const result = await api.updateCredentials(params);

      expect(mockClient.v1.accounts.updateCredentials).toHaveBeenCalledWith(
        params,
      );
      expect(result.discoverable).toBe(false);
    });

    it("should update profile fields", async () => {
      const params = {
        fieldsAttributes: [
          { name: "Website", value: "https://example.com" },
          { name: "Location", value: "San Francisco" },
        ],
      };

      mockClient.v1.accounts.updateCredentials.mockResolvedValue({
        id: "user123",
        fields: params.fieldsAttributes,
      });

      const result = await api.updateCredentials(params);

      expect(mockClient.v1.accounts.updateCredentials).toHaveBeenCalledWith(
        params,
      );
      expect(result.fields).toEqual(params.fieldsAttributes);
    });

    it("should update source preferences", async () => {
      const params = {
        source: {
          privacy: "private" as const,
          sensitive: true,
          language: "en",
        },
      };

      mockClient.v1.accounts.updateCredentials.mockResolvedValue({
        id: "user123",
        source: params.source,
      });

      const result = await api.updateCredentials(params);

      expect(mockClient.v1.accounts.updateCredentials).toHaveBeenCalledWith(
        params,
      );
    });

    it("should handle update errors", async () => {
      mockClient.v1.accounts.updateCredentials.mockRejectedValue(
        new Error("Validation failed"),
      );

      await expect(
        api.updateCredentials({ displayName: "Test" }),
      ).rejects.toThrow("Validation failed");
    });
  });

  describe("getPreferences", () => {
    it("should fetch account preferences", async () => {
      const mockPreferences = {
        "posting:default:visibility": "public",
        "posting:default:sensitive": false,
        "posting:default:language": "en",
        "reading:expand:media": "default",
        "reading:expand:spoilers": false,
      };

      mockClient.v1.preferences.fetch.mockResolvedValue(mockPreferences);

      const result = await api.getPreferences();

      expect(mockClient.v1.preferences.fetch).toHaveBeenCalled();
      expect(result).toEqual(mockPreferences);
    });

    it("should handle preferences fetch errors", async () => {
      mockClient.v1.preferences.fetch.mockRejectedValue(
        new Error("Unauthorized"),
      );

      await expect(api.getPreferences()).rejects.toThrow("Unauthorized");
    });
  });

  describe("uploadMedia", () => {
    it("should upload media file", async () => {
      const file = {
        uri: "file:///path/to/image.jpg",
        name: "image.jpg",
        type: "image/jpeg",
      };

      const mockMediaAttachment = {
        id: "media123",
        type: "image",
        url: "https://example.com/media/image.jpg",
        previewUrl: "https://example.com/media/thumb.jpg",
      };

      mockClient.v2.media.create.mockResolvedValue(mockMediaAttachment);

      const result = await api.uploadMedia(file);

      expect(mockClient.v2.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          file: expect.anything(),
        }),
      );
      expect(result).toEqual(mockMediaAttachment);
    });

    it("should handle upload errors", async () => {
      const file = {
        uri: "file:///path/to/image.jpg",
        name: "image.jpg",
        type: "image/jpeg",
      };

      mockClient.v2.media.create.mockRejectedValue(new Error("File too large"));

      await expect(api.uploadMedia(file)).rejects.toThrow("File too large");
    });
  });

  describe("getFollowing", () => {
    it("should fetch following list for account", async () => {
      const accountId = "user123";
      const mockFollowing = [
        { id: "user1", username: "user1" },
        { id: "user2", username: "user2" },
      ];

      // Get the mock that $select returns and configure its list method
      const selectResult = mockClient.v1.accounts.$select(accountId);
      selectResult.following.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield mockFollowing;
        },
      });

      const result = await api.getFollowing(accountId);

      expect(mockClient.v1.accounts.$select).toHaveBeenCalledWith(accountId);
      expect(selectResult.following.list).toHaveBeenCalled();
      expect(result).toEqual(mockFollowing);
    });

    it("should pass options to following list", async () => {
      const accountId = "user123";
      const options = { limit: 20 };

      const selectResult = mockClient.v1.accounts.$select(accountId);
      selectResult.following.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield [];
        },
      });

      await api.getFollowing(accountId, options);

      expect(selectResult.following.list).toHaveBeenCalledWith(options);
    });

    it("should handle following fetch errors", async () => {
      const accountId = "user123";
      const selectResult = mockClient.v1.accounts.$select(accountId);
      // Mock the paginator to have an async iterator that rejects when next() is called
      const mockIterator = {
        next: jest.fn().mockRejectedValue(new Error("Not found")),
      };
      selectResult.following.list.mockReturnValue({
        [Symbol.asyncIterator]: () => mockIterator,
      });

      await expect(api.getFollowing(accountId)).rejects.toThrow("Not found");
    });
  });

  describe("getFollowers", () => {
    it("should fetch followers list for account", async () => {
      const accountId = "user123";
      const mockFollowers = [
        { id: "user1", username: "user1" },
        { id: "user2", username: "user2" },
      ];

      const selectResult = mockClient.v1.accounts.$select(accountId);
      selectResult.followers.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield mockFollowers;
        },
      });

      const result = await api.getFollowers(accountId);

      expect(mockClient.v1.accounts.$select).toHaveBeenCalledWith(accountId);
      expect(selectResult.followers.list).toHaveBeenCalled();
      expect(result).toEqual(mockFollowers);
    });

    it("should pass options to followers list", async () => {
      const accountId = "user123";
      const options = { limit: 20 };

      const selectResult = mockClient.v1.accounts.$select(accountId);
      selectResult.followers.list.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield [];
        },
      });

      await api.getFollowers(accountId, options);

      expect(selectResult.followers.list).toHaveBeenCalledWith(options);
    });

    it("should handle followers fetch errors", async () => {
      const accountId = "user123";
      const selectResult = mockClient.v1.accounts.$select(accountId);
      // Mock the paginator to have an async iterator that rejects when next() is called
      const mockIterator = {
        next: jest.fn().mockRejectedValue(new Error("Not found")),
      };
      selectResult.followers.list.mockReturnValue({
        [Symbol.asyncIterator]: () => mockIterator,
      });

      await expect(api.getFollowers(accountId)).rejects.toThrow("Not found");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete profile update workflow", async () => {
      // 1. Verify current credentials
      const currentAccount = {
        id: "user123",
        username: "testuser",
        displayName: "Old Name",
      };
      mockClient.v1.accounts.verifyCredentials.mockResolvedValueOnce(
        currentAccount,
      );

      const current = await api.verifyCredentials();
      expect(current).toEqual(currentAccount);
      expect(current.displayName).toBe("Old Name");

      // 2. Update profile
      const updatedAccount = {
        ...currentAccount,
        displayName: "New Name",
      };
      mockClient.v1.accounts.updateCredentials.mockResolvedValueOnce(
        updatedAccount,
      );

      const updated = await api.updateCredentials({ displayName: "New Name" });
      expect(updated).toEqual(updatedAccount);
      expect(updated.displayName).toBe("New Name");

      // 3. Verify update
      mockClient.v1.accounts.verifyCredentials.mockResolvedValueOnce(
        updatedAccount,
      );

      const verified = await api.verifyCredentials();
      expect(verified).toEqual(updatedAccount);
      expect(verified.displayName).toBe("New Name");
    });

    it("should handle preferences update workflow", async () => {
      // 1. Get current preferences
      const currentPrefs = {
        "posting:default:visibility": "public" as const,
        "posting:default:sensitive": false,
      };
      mockClient.v1.preferences.fetch.mockResolvedValueOnce(currentPrefs);

      const prefs = await api.getPreferences();
      expect(prefs).toEqual(currentPrefs);
      expect(prefs["posting:default:visibility"]).toBe("public");

      // 2. Update via credentials
      mockClient.v1.accounts.updateCredentials.mockResolvedValueOnce({
        id: "user123",
      });

      await api.updateCredentials({
        source: { privacy: "private", sensitive: true },
      });

      // 3. Verify preferences updated
      const updatedPrefs = {
        "posting:default:visibility": "private" as const,
        "posting:default:sensitive": true,
      };
      mockClient.v1.preferences.fetch.mockResolvedValueOnce(updatedPrefs);

      const newPrefs = await api.getPreferences();
      expect(newPrefs).toEqual(updatedPrefs);
      expect(newPrefs["posting:default:visibility"]).toBe("private");
      expect(newPrefs["posting:default:sensitive"]).toBe(true);
    });
  });
});
