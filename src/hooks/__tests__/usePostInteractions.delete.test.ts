/**
 * usePostInteractions Hook Tests - Delete Post Functionality
 */

import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { usePostInteractions } from "../usePostInteractions";
import { getActiveClient } from "@lib/api/client";
import type { Post } from "@types";

// Mock dependencies
jest.mock("@lib/api/client");

// Spy on Alert.alert
const alertSpy = jest.spyOn(Alert, "alert");

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

describe("usePostInteractions - Delete Post", () => {
  const mockDeleteStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();

    (getActiveClient as jest.Mock).mockResolvedValue({
      client: {
        v1: {
          statuses: {
            $select: jest.fn(() => ({
              remove: mockDeleteStatus,
            })),
          },
        },
      },
    });
  });

  it("should show confirmation dialog before deleting", async () => {
    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost }),
    );

    await act(async () => {
      await result.current.deletePost();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Delete Post?",
      "Are you sure you want to delete this post? This action cannot be undone.",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancel" }),
        expect.objectContaining({ text: "Delete" }),
      ]),
    );
  });

  it("should delete post when user confirms", async () => {
    mockDeleteStatus.mockResolvedValue({});

    // Mock Alert.alert to auto-confirm
    alertSpy.mockImplementation((title, message, buttons) => {
      const deleteButton = buttons?.find((b: any) => b.text === "Delete");
      if (deleteButton?.onPress) {
        deleteButton.onPress();
      }
    });

    const onDelete = jest.fn();
    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost, onDelete }),
    );

    await act(async () => {
      await result.current.deletePost();
    });

    // Wait for async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mockDeleteStatus).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith(mockPost.id);
  });

  it("should not delete post when user cancels", async () => {
    // Mock Alert.alert to cancel
    alertSpy.mockImplementation((title, message, buttons) => {
      const cancelButton = buttons?.find((b: any) => b.text === "Cancel");
      if (cancelButton?.onPress) {
        cancelButton.onPress();
      }
    });

    const onDelete = jest.fn();
    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost, onDelete }),
    );

    await act(async () => {
      await result.current.deletePost();
    });

    expect(mockDeleteStatus).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("should show error alert when deletion fails", async () => {
    mockDeleteStatus.mockRejectedValue(new Error("Network error"));

    // Mock Alert.alert to auto-confirm
    alertSpy.mockImplementation((title, message, buttons) => {
      const deleteButton = buttons?.find((b: any) => b.text === "Delete");
      if (deleteButton?.onPress) {
        deleteButton.onPress();
      }
    });

    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost }),
    );

    await act(async () => {
      await result.current.deletePost();
    });

    // Wait for async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should show error alert
    expect(alertSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("should call onDelete callback after successful deletion", async () => {
    mockDeleteStatus.mockResolvedValue({});

    // Mock Alert.alert to auto-confirm
    alertSpy.mockImplementation((title, message, buttons) => {
      const deleteButton = buttons?.find((b: any) => b.text === "Delete");
      if (deleteButton?.onPress) {
        deleteButton.onPress();
      }
    });

    const onDelete = jest.fn();
    const { result } = renderHook(() =>
      usePostInteractions({ post: mockPost, onDelete }),
    );

    await act(async () => {
      await result.current.deletePost();
    });

    // Wait for async operations
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(onDelete).toHaveBeenCalledWith(mockPost.id);
  });
});
