/**
 * usePostInteractions Hook Tests - Reply Functionality
 * Following TDD approach - tests written first
 */

import { renderHook, act } from "@testing-library/react-native";
import { usePostInteractions } from "../usePostInteractions";
import type { Post } from "@types";

// Mock dependencies
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@lib/api/client");

const mockPush = jest.fn();
const { useRouter } = require("expo-router");

const mockPost: Post = {
  id: "123",
  content: "<p>This is a test post with <strong>HTML</strong> tags</p>",
  createdAt: "2024-01-01T12:00:00.000Z",
  account: {
    id: "user1",
    username: "testuser",
    acct: "testuser@mastodon.social",
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

describe("usePostInteractions - Reply Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
    });
  });

  it("should navigate to compose modal with reply context", () => {
    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost }),
    );

    act(() => {
      result.current.reply();
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/modals/compose",
      }),
    );
  });

  it("should include replyToId parameter", () => {
    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost }),
    );

    act(() => {
      result.current.reply();
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          replyToId: "123",
        }),
      }),
    );
  });

  it("should include replyToUsername parameter with account acct", () => {
    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost }),
    );

    act(() => {
      result.current.reply();
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          replyToUsername: "testuser@mastodon.social",
        }),
      }),
    );
  });

  it("should strip HTML tags from content preview", () => {
    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost }),
    );

    act(() => {
      result.current.reply();
    });

    const callArgs = mockPush.mock.calls[0][0];
    const contentParam = callArgs.params.replyToContent;

    // Should not contain HTML tags
    expect(contentParam).not.toContain("<p>");
    expect(contentParam).not.toContain("<strong>");
    expect(contentParam).not.toContain("</p>");
    expect(contentParam).not.toContain("</strong>");

    // Should contain plain text
    expect(contentParam).toContain("This is a test post");
  });

  it("should limit content preview to 100 characters", () => {
    const longContentPost: Post = {
      ...mockPost,
      content: "<p>" + "a".repeat(200) + "</p>",
    };

    const { result } = renderHook(() =>
      usePostInteractions({ post: longContentPost }),
    );

    act(() => {
      result.current.reply();
    });

    const callArgs = mockPush.mock.calls[0][0];
    const contentParam = callArgs.params.replyToContent;

    expect(contentParam.length).toBeLessThanOrEqual(100);
  });

  it("should handle post with no content gracefully", () => {
    const emptyPost: Post = {
      ...mockPost,
      content: "",
    };

    const { result } = renderHook(() =>
      usePostInteractions({ post: emptyPost }),
    );

    act(() => {
      result.current.reply();
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          replyToContent: "",
        }),
      }),
    );
  });

  it("should handle special characters in content preview", () => {
    const specialCharsPost: Post = {
      ...mockPost,
      content: "<p>Test with &amp; &lt; &gt; &quot; special chars</p>",
    };

    const { result } = renderHook(() =>
      usePostInteractions({ post: specialCharsPost }),
    );

    act(() => {
      result.current.reply();
    });

    const callArgs = mockPush.mock.calls[0][0];
    const contentParam = callArgs.params.replyToContent;

    // Should strip HTML tags but preserve text content
    expect(contentParam).not.toContain("<p>");
    expect(contentParam).toContain("special chars");
  });

  it("should handle posts with nested HTML tags", () => {
    const nestedHtmlPost: Post = {
      ...mockPost,
      content: "<p>This is <strong>bold <em>and italic</em></strong> text</p>",
    };

    const { result } = renderHook(() =>
      usePostInteractions({ post: nestedHtmlPost }),
    );

    act(() => {
      result.current.reply();
    });

    const callArgs = mockPush.mock.calls[0][0];
    const contentParam = callArgs.params.replyToContent;

    // Should strip all nested HTML tags
    expect(contentParam).not.toContain("<p>");
    expect(contentParam).not.toContain("<strong>");
    expect(contentParam).not.toContain("<em>");
    expect(contentParam).toContain("bold and italic");
  });

  it("should use correct username for federated accounts", () => {
    const federatedPost: Post = {
      ...mockPost,
      account: {
        ...mockPost.account,
        acct: "user@example.com",
      },
    };

    const { result } = renderHook(() =>
      usePostInteractions({ post: federatedPost }),
    );

    act(() => {
      result.current.reply();
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          replyToUsername: "user@example.com",
        }),
      }),
    );
  });

  it("should work with boosted posts (reblogs)", () => {
    const boostedPost: Post = {
      ...mockPost,
      reblog: {
        ...mockPost,
        id: "original-123",
        account: {
          ...mockPost.account,
          username: "originaluser",
          acct: "originaluser",
        },
      },
    };

    const { result } = renderHook(() =>
      usePostInteractions({ post: boostedPost }),
    );

    act(() => {
      result.current.reply();
    });

    // Should reply to the original post (reblog), not the boost
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          replyToId: "123", // The parent post ID
          replyToUsername: "testuser@mastodon.social",
        }),
      }),
    );
  });
});
