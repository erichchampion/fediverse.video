/**
 * usePostInteractions Hook Tests - Sharing with Instance URL
 */

import { renderHook, act } from "@testing-library/react-native";
import { usePostInteractions } from "../usePostInteractions";
import type { Post } from "@types";
import { Share } from "react-native";

// Mock dependencies
jest.mock("@lib/api/client");

// Spy on Share.share
const shareSpy = jest
  .spyOn(Share, "share")
  .mockResolvedValue({ action: "sharedAction" });

const mockPost: Post = {
  id: "123",
  content: "<p>Test post content</p>",
  createdAt: "2024-01-01T12:00:00.000Z",
  account: {
    id: "user1",
    username: "testuser",
    displayName: "Test User",
    avatar: "https://example.com/avatar.jpg",
    header: "",
    followersCount: 100,
    followingCount: 50,
    statusesCount: 200,
  },
  mediaAttachments: [],
  favouritesCount: 5,
  reblogsCount: 2,
  repliesCount: 1,
  favourited: false,
  reblogged: false,
  bookmarked: false,
  sensitive: false,
  spoilerText: "",
  visibility: "public",
  url: "https://mastodon.social/@testuser/123",
  reblog: null,
  inReplyToId: null,
  inReplyToAccountId: null,
  tags: [],
  mentions: [],
  emojis: [],
  uri: "https://mastodon.social/users/testuser/statuses/123",
};

describe("usePostInteractions - Share with Instance URL", () => {
  beforeEach(() => {
    shareSpy.mockClear();
  });

  it("should include instance URL in share message", async () => {
    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost }),
    );

    await act(async () => {
      await result.current.share();
    });

    expect(shareSpy).toHaveBeenCalledWith({
      message: expect.stringContaining("mastodon.social"),
      url: mockPost.url,
    });
  });

  it("should format share message with username and instance", async () => {
    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost }),
    );

    await act(async () => {
      await result.current.share();
    });

    expect(shareSpy).toHaveBeenCalledWith({
      message: expect.stringContaining("@testuser"),
      url: mockPost.url,
    });
  });

  it("should fallback to post URL when instance extraction fails", async () => {
    const postWithoutInstance = {
      ...mockPost,
      url: "invalid-url",
    };

    const { result } = renderHook(() =>
      usePostInteractions({ post: postWithoutInstance }),
    );

    await act(async () => {
      await result.current.share();
    });

    expect(shareSpy).toHaveBeenCalledWith({
      message: "invalid-url",
      url: "invalid-url",
    });
  });

  it("should not share when post URL is not available", async () => {
    const postWithoutUrl = {
      ...mockPost,
      url: "",
    };

    const { result } = renderHook(() =>
      usePostInteractions({ post: postWithoutUrl }),
    );

    await act(async () => {
      await result.current.share();
    });

    expect(shareSpy).not.toHaveBeenCalled();
  });

  it("should extract instance from various URL formats", async () => {
    const testCases = [
      {
        url: "https://mastodon.social/@user/123",
        expected: "mastodon.social",
      },
      {
        url: "https://mastodon.online/@user/123",
        expected: "mastodon.online",
      },
      {
        url: "https://fosstodon.org/@user/123",
        expected: "fosstodon.org",
      },
    ];

    for (const testCase of testCases) {
      const testPost = { ...mockPost, url: testCase.url };
      const { result } = renderHook(() =>
        usePostInteractions({ post: testPost }),
      );

      await act(async () => {
        await result.current.share();
      });

      expect(shareSpy).toHaveBeenCalledWith({
        message: expect.stringContaining(testCase.expected),
        url: testCase.url,
      });

      shareSpy.mockClear();
    }
  });
});
