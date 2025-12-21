/**
 * useComments Hook Tests
 * Following TDD approach - tests written first
 */

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useComments } from "../useComments";
import { getActiveClient } from "@lib/api/client";
import type { Post } from "@types";

// Mock dependencies
jest.mock("@lib/api/client", () => ({
  getActiveClient: jest.fn(),
  withRetry: jest.fn((fn) => fn()), // Mock withRetry to just execute the function
  RequestPriority: {
    HIGH: 0,
    NORMAL: 1,
    LOW: 2,
  },
}));

const mockGetActiveClient = getActiveClient as jest.MockedFunction<
  typeof getActiveClient
>;

const mockComment: Post = {
  id: "comment1",
  content: "<p>Test comment</p>",
  createdAt: "2024-01-01T12:00:00.000Z",
  account: {
    id: "user1",
    username: "testuser",
    displayName: "Test User",
    avatar: "https://example.com/avatar.jpg",
    acct: "testuser",
    url: "https://mastodon.social/@testuser",
    header: "",
    bot: false,
    locked: false,
    createdAt: "2020-01-01T00:00:00.000Z",
    followersCount: 100,
    followingCount: 50,
    statusesCount: 200,
    note: "",
    fields: [],
    emojis: [],
  },
  favouritesCount: 5,
  reblogsCount: 2,
  repliesCount: 0,
  favourited: false,
  reblogged: false,
  uri: "https://mastodon.social/users/testuser/statuses/comment1",
  url: "https://mastodon.social/@testuser/comment1",
  visibility: "public",
  sensitive: false,
  spoilerText: "",
  mediaAttachments: [],
  mentions: [],
  tags: [],
  emojis: [],
};

describe("useComments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with empty comments array and start loading", async () => {
    const mockClient = {
      v1: {
        statuses: {
          $select: jest.fn().mockReturnValue({
            context: {
              fetch: jest.fn().mockResolvedValue({
                ancestors: [],
                descendants: [],
              }),
            },
          }),
        },
      },
    };

    mockGetActiveClient.mockResolvedValue({
      client: mockClient as any,
      instanceUrl: "https://mastodon.social",
    });

    const { result } = renderHook(() => useComments({ postId: "123" }));

    // Initially, comments are empty and loading has started
    expect(result.current.comments).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should fetch comments on mount", async () => {
    const mockClient = {
      v1: {
        statuses: {
          $select: jest.fn().mockReturnValue({
            context: {
              fetch: jest.fn().mockResolvedValue({
                ancestors: [],
                descendants: [mockComment],
              }),
            },
          }),
        },
      },
    };

    mockGetActiveClient.mockResolvedValue({
      client: mockClient as any,
      instanceUrl: "https://mastodon.social",
    });

    const { result } = renderHook(() => useComments({ postId: "123" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].id).toBe("comment1");
  });

  it("should call onCommentCountUpdate with correct count", async () => {
    const mockClient = {
      v1: {
        statuses: {
          $select: jest.fn().mockReturnValue({
            context: {
              fetch: jest.fn().mockResolvedValue({
                ancestors: [],
                descendants: [mockComment, { ...mockComment, id: "comment2" }],
              }),
            },
          }),
        },
      },
    };

    mockGetActiveClient.mockResolvedValue({
      client: mockClient as any,
      instanceUrl: "https://mastodon.social",
    });

    const onCommentCountUpdate = jest.fn();

    renderHook(() => useComments({ postId: "123", onCommentCountUpdate }));

    await waitFor(() => {
      expect(onCommentCountUpdate).toHaveBeenCalledWith(2);
    });
  });

  it("should handle fetch errors gracefully", async () => {
    const mockClient = {
      v1: {
        statuses: {
          $select: jest.fn().mockReturnValue({
            context: {
              fetch: jest.fn().mockRejectedValue(new Error("Network error")),
            },
          }),
        },
      },
    };

    mockGetActiveClient.mockResolvedValue({
      client: mockClient as any,
      instanceUrl: "https://mastodon.social",
    });

    const { result } = renderHook(() => useComments({ postId: "123" }));

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to load comments");
    });

    expect(result.current.comments).toEqual([]);
  });

  it("should create a new comment", async () => {
    const mockClient = {
      v1: {
        statuses: {
          $select: jest.fn().mockReturnValue({
            context: {
              fetch: jest.fn().mockResolvedValue({
                ancestors: [],
                descendants: [],
              }),
            },
          }),
          create: jest.fn().mockResolvedValue({
            ...mockComment,
            id: "new-comment",
            content: "<p>New comment</p>",
          }),
        },
      },
    };

    mockGetActiveClient.mockResolvedValue({
      client: mockClient as any,
      instanceUrl: "https://mastodon.social",
    });

    const { result } = renderHook(() => useComments({ postId: "123" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createComment("New comment");
    });

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
      expect(result.current.comments[0].id).toBe("new-comment");
    });
  });

  it("should create a reply to a specific comment", async () => {
    const mockClient = {
      v1: {
        statuses: {
          $select: jest.fn().mockReturnValue({
            context: {
              fetch: jest.fn().mockResolvedValue({
                ancestors: [],
                descendants: [mockComment],
              }),
            },
          }),
          create: jest.fn().mockResolvedValue({
            ...mockComment,
            id: "reply-comment",
            content: "<p>Reply to comment</p>",
            inReplyToId: "comment1",
          }),
        },
      },
    };

    mockGetActiveClient.mockResolvedValue({
      client: mockClient as any,
      instanceUrl: "https://mastodon.social",
    });

    const { result } = renderHook(() => useComments({ postId: "123" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createComment("Reply to comment", "comment1");
    });

    expect(mockClient.v1.statuses.create).toHaveBeenCalledWith({
      status: "Reply to comment",
      inReplyToId: "comment1",
      visibility: "public",
    });
  });

  it("should handle comment creation errors", async () => {
    const mockClient = {
      v1: {
        statuses: {
          $select: jest.fn().mockReturnValue({
            context: {
              fetch: jest.fn().mockResolvedValue({
                ancestors: [],
                descendants: [],
              }),
            },
          }),
          create: jest
            .fn()
            .mockRejectedValue(new Error("Failed to create comment")),
        },
      },
    };

    mockGetActiveClient.mockResolvedValue({
      client: mockClient as any,
      instanceUrl: "https://mastodon.social",
    });

    const { result } = renderHook(() => useComments({ postId: "123" }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.createComment("New comment");
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.comments).toHaveLength(0);
  });

  it("should refresh comments", async () => {
    const mockClient = {
      v1: {
        statuses: {
          $select: jest.fn().mockReturnValue({
            context: {
              fetch: jest
                .fn()
                .mockResolvedValueOnce({
                  ancestors: [],
                  descendants: [mockComment],
                })
                .mockResolvedValueOnce({
                  ancestors: [],
                  descendants: [
                    mockComment,
                    { ...mockComment, id: "comment2" },
                  ],
                }),
            },
          }),
        },
      },
    };

    mockGetActiveClient.mockResolvedValue({
      client: mockClient as any,
      instanceUrl: "https://mastodon.social",
    });

    const { result } = renderHook(() => useComments({ postId: "123" }));

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
    });

    await act(async () => {
      await result.current.refreshComments();
    });

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(2);
    });
  });

  it("should handle missing client gracefully", async () => {
    mockGetActiveClient.mockResolvedValue(null);

    const { result } = renderHook(() => useComments({ postId: "123" }));

    await waitFor(() => {
      expect(result.current.error).toBe("No active client available");
    });
  });

  it("should not fetch if postId is empty", () => {
    const { result } = renderHook(() => useComments({ postId: "" }));

    expect(result.current.comments).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
