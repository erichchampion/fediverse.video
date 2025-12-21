/**
 * Tests for Mastodon API Request Helpers
 */

import {
  getFollowedAccounts,
  getFollowedHashtags,
  getSuggestions,
} from "../mastodonRequests";
import type { MastodonClient } from "../mastodonRequests";

// Mock data
const mockFollowedAccounts = [
  {
    id: "1",
    username: "user1",
    acct: "user1@example.com",
    displayName: "User One",
    avatar: "https://example.com/avatar1.jpg",
  },
  {
    id: "2",
    username: "user2",
    acct: "user2@example.com",
    displayName: "User Two",
    avatar: "https://example.com/avatar2.jpg",
  },
];

const mockHashtags = [
  { name: "tech", url: "https://example.com/tags/tech" },
  { name: "javascript", url: "https://example.com/tags/javascript" },
];

// API returns Account objects directly (not wrapped in Suggestion with account property)
const mockSuggestions = [
  {
    id: "3",
    username: "suggested1",
    acct: "suggested1@example.com",
    displayName: "Suggested One",
    avatar: "https://example.com/avatar3.jpg",
    note: "This is a suggested account",
    followersCount: 100,
    followingCount: 50,
    statusesCount: 200,
  },
  {
    id: "4",
    username: "suggested2",
    acct: "suggested2@example.com",
    displayName: "Suggested Two",
    avatar: "https://example.com/avatar4.jpg",
    note: "Another suggested account",
    followersCount: 150,
    followingCount: 75,
    statusesCount: 300,
  },
];

describe("mastodonRequests", () => {
  describe("getFollowedAccounts", () => {
    it("should fetch and return followed accounts", async () => {
      const mockClient = {
        v1: {
          accounts: {
            verifyCredentials: jest
              .fn()
              .mockResolvedValue({ id: "123", username: "currentUser" }),
            $select: jest.fn().mockReturnValue({
              following: {
                list: jest.fn().mockReturnValue({
                  // Mock paginator with .values() method
                  values: jest.fn().mockReturnValue({
                    async *[Symbol.asyncIterator]() {
                      yield mockFollowedAccounts;
                    },
                  }),
                }),
              },
            }),
          },
        },
      } as unknown as MastodonClient;

      const result = await getFollowedAccounts(mockClient);

      expect(result).toEqual(mockFollowedAccounts);
      expect(mockClient.v1.accounts.verifyCredentials).toHaveBeenCalled();
      expect(mockClient.v1.accounts.$select).toHaveBeenCalledWith("123");
    });

    it("should throw error when client is not available", async () => {
      const mockClient = null as unknown as MastodonClient;

      await expect(getFollowedAccounts(mockClient)).rejects.toThrow(
        "Mastodon client not available",
      );
    });

    it("should handle empty followed accounts", async () => {
      const mockClient = {
        v1: {
          accounts: {
            verifyCredentials: jest
              .fn()
              .mockResolvedValue({ id: "123", username: "currentUser" }),
            $select: jest.fn().mockReturnValue({
              following: {
                list: jest.fn().mockReturnValue({
                  values: jest.fn().mockReturnValue({
                    async *[Symbol.asyncIterator]() {
                      yield [];
                    },
                  }),
                }),
              },
            }),
          },
        },
      } as unknown as MastodonClient;

      const result = await getFollowedAccounts(mockClient);

      expect(result).toEqual([]);
    });
  });

  describe("getFollowedHashtags", () => {
    it("should fetch and return followed hashtags", async () => {
      const mockClient = {
        v1: {
          followedTags: {
            list: jest.fn().mockReturnValue({
              values: jest.fn().mockReturnValue({
                async *[Symbol.asyncIterator]() {
                  yield mockHashtags;
                },
              }),
            }),
          },
        },
      } as unknown as MastodonClient;

      const result = await getFollowedHashtags(mockClient);

      expect(result).toEqual(mockHashtags);
      expect(mockClient.v1.followedTags.list).toHaveBeenCalledWith({
        limit: 80,
      });
    });

    it("should throw error when client is not available", async () => {
      const mockClient = null as unknown as MastodonClient;

      await expect(getFollowedHashtags(mockClient)).rejects.toThrow(
        "Mastodon client not available",
      );
    });

    it("should handle empty followed hashtags", async () => {
      const mockClient = {
        v1: {
          followedTags: {
            list: jest.fn().mockReturnValue({
              values: jest.fn().mockReturnValue({
                async *[Symbol.asyncIterator]() {
                  yield [];
                },
              }),
            }),
          },
        },
      } as unknown as MastodonClient;

      const result = await getFollowedHashtags(mockClient);

      expect(result).toEqual([]);
    });
  });

  describe("getSuggestions", () => {
    it("should fetch and return account suggestions", async () => {
      const mockClient = {
        v1: {
          suggestions: {
            list: jest.fn().mockReturnValue({
              values: jest.fn().mockReturnValue({
                async *[Symbol.asyncIterator]() {
                  yield mockSuggestions;
                },
              }),
            }),
          },
        },
      } as unknown as MastodonClient;

      const result = await getSuggestions(mockClient, 20);

      expect(result).toEqual(mockSuggestions);
      expect(mockClient.v1.suggestions.list).toHaveBeenCalledWith({
        limit: 20,
      });
    });

    it("should use default limit of 20 when not specified", async () => {
      const mockClient = {
        v1: {
          suggestions: {
            list: jest.fn().mockReturnValue({
              values: jest.fn().mockReturnValue({
                async *[Symbol.asyncIterator]() {
                  yield mockSuggestions;
                },
              }),
            }),
          },
        },
      } as unknown as MastodonClient;

      const result = await getSuggestions(mockClient);

      expect(result).toEqual(mockSuggestions);
      expect(mockClient.v1.suggestions.list).toHaveBeenCalledWith({
        limit: 20,
      });
    });

    it("should throw error when client is not available", async () => {
      const mockClient = null as unknown as MastodonClient;

      await expect(getSuggestions(mockClient)).rejects.toThrow(
        "Mastodon client not available",
      );
    });

    it("should handle empty suggestions", async () => {
      const mockClient = {
        v1: {
          suggestions: {
            list: jest.fn().mockReturnValue({
              values: jest.fn().mockReturnValue({
                async *[Symbol.asyncIterator]() {
                  yield [];
                },
              }),
            }),
          },
        },
      } as unknown as MastodonClient;

      const result = await getSuggestions(mockClient);

      expect(result).toEqual([]);
    });

    it("should return Account objects with all necessary fields", async () => {
      const mockClient = {
        v1: {
          suggestions: {
            list: jest.fn().mockReturnValue({
              values: jest.fn().mockReturnValue({
                async *[Symbol.asyncIterator]() {
                  yield mockSuggestions;
                },
              }),
            }),
          },
        },
      } as unknown as MastodonClient;

      const result = await getSuggestions(mockClient);

      expect(result).toHaveLength(2);

      // Verify first suggestion has Account structure (not wrapped in Suggestion object)
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("username");
      expect(result[0]).toHaveProperty("acct");
      expect(result[0]).toHaveProperty("displayName");
      expect(result[0]).toHaveProperty("avatar");
      expect(result[0]).toHaveProperty("note");
      expect(result[0]).toHaveProperty("followersCount");
      expect(result[0]).toHaveProperty("followingCount");
      expect(result[0]).toHaveProperty("statusesCount");

      // Verify it's NOT wrapped (no account property)
      expect(result[0]).not.toHaveProperty("account");
    });
  });
});
