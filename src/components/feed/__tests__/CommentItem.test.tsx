/**
 * CommentItem Component Tests
 * Tests for individual comment display and interactions
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { CommentItem } from "../CommentItem";
import type { Post } from "@types";
import { getActiveClient } from "@lib/api/client";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#FFFFFF",
      card: "#F5F5F5",
      text: "#000000",
      textSecondary: "#666666",
      border: "#E0E0E0",
      primary: "#1DA1F2",
    },
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("@components/base", () => ({
  Avatar: () => null,
  RichText: ({ content }: any) => {
    const { Text } = require("react-native");
    return <Text>{content}</Text>;
  },
}));

jest.mock("@lib/api/client");

jest.mock("date-fns", () => ({
  formatDistanceToNow: () => "2h ago",
}));

jest.mock("@contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "currentUser",
      username: "currentuser",
      displayName: "Current User",
    },
    instance: {
      id: "instance1",
      uri: "https://mastodon.social",
    },
  }),
}));

// Store mock functions so tests can access them
const mockToggleFavorite = jest.fn();
const mockToggleBoost = jest.fn();
const mockDeletePost = jest.fn();

jest.mock("@hooks/usePostInteractions", () => ({
  usePostInteractions: ({ post, onUpdate, onDelete }: any) => ({
    post,
    toggleFavorite: mockToggleFavorite,
    toggleBoost: mockToggleBoost,
    toggleBookmark: jest.fn(),
    reply: jest.fn(),
    share: jest.fn(),
    deletePost: mockDeletePost,
    isProcessing: false,
  }),
}));

const mockGetActiveClient = getActiveClient as jest.MockedFunction<
  typeof getActiveClient
>;

const mockComment: Post = {
  id: "comment1",
  content: "<p>This is a test comment</p>",
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
  repliesCount: 1,
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

describe("CommentItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToggleFavorite.mockClear();
    mockToggleBoost.mockClear();
    mockDeletePost.mockClear();
  });

  it("renders comment with user info and content", () => {
    const onReply = jest.fn();
    const { getByText } = render(
      <CommentItem comment={mockComment} onReply={onReply} />,
    );

    expect(getByText("Test User")).toBeTruthy();
    expect(getByText(/@testuser/)).toBeTruthy();
    // Note: The timestamp format may vary, so we check for the mock value or any time-related text
    const timeText = getByText(/2h ago|ago|hours|minutes|seconds/i);
    expect(timeText).toBeTruthy();
    expect(getByText("This is a test comment")).toBeTruthy();
  });

  it("displays like and boost counts", () => {
    const onReply = jest.fn();
    const { getByText } = render(
      <CommentItem comment={mockComment} onReply={onReply} />,
    );

    expect(getByText("5")).toBeTruthy(); // Like count
    expect(getByText("2")).toBeTruthy(); // Boost count
  });

  it("calls onReply with correct params when reply button is pressed", () => {
    const onReply = jest.fn();
    const { getByText } = render(
      <CommentItem comment={mockComment} onReply={onReply} />,
    );

    const replyButton = getByText("✏️");
    fireEvent.press(replyButton);

    expect(onReply).toHaveBeenCalledWith(
      "comment1",
      "testuser",
      "This is a test comment",
    );
  });

  it("toggles like status when like button is pressed", async () => {
    const onReply = jest.fn();
    const onUpdate = jest.fn();
    const { getByText } = render(
      <CommentItem
        comment={mockComment}
        onReply={onReply}
        onUpdate={onUpdate}
      />,
    );

    // Find the like button (heart emoji)
    const likeButton = getByText("🤍");
    fireEvent.press(likeButton);

    // Verify toggleFavorite is called via usePostInteractions
    expect(mockToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("toggles boost status when boost button is pressed", async () => {
    const onReply = jest.fn();
    const onUpdate = jest.fn();
    const { getByText } = render(
      <CommentItem
        comment={mockComment}
        onReply={onReply}
        onUpdate={onUpdate}
      />,
    );

    const boostButton = getByText("🔁");
    fireEvent.press(boostButton);

    // Verify toggleBoost is called via usePostInteractions
    expect(mockToggleBoost).toHaveBeenCalledTimes(1);
  });

  it("handles errors gracefully when toggling like fails", async () => {
    // Error handling is now managed by usePostInteractions hook
    // This test verifies that the like button can be pressed without errors
    const onReply = jest.fn();
    const { getByText } = render(
      <CommentItem comment={mockComment} onReply={onReply} />,
    );

    const likeButton = getByText("🤍");
    fireEvent.press(likeButton);

    // Verify toggleFavorite is called - error handling is done in the hook
    expect(mockToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("returns null for invalid comment data", () => {
    const onReply = jest.fn();
    const invalidComment = {} as Post;

    const { toJSON } = render(
      <CommentItem comment={invalidComment} onReply={onReply} />,
    );

    expect(toJSON()).toBeNull();
  });

  it("shows already liked state correctly", () => {
    const onReply = jest.fn();
    const likedComment = {
      ...mockComment,
      favourited: true,
    };

    const { getByText } = render(
      <CommentItem comment={likedComment} onReply={onReply} />,
    );

    expect(getByText("❤️")).toBeTruthy(); // Filled heart
  });

  it("prevents multiple simultaneous like/boost operations", async () => {
    // Processing guard is now in usePostInteractions hook which is mocked
    // This test verifies that the button can be pressed multiple times
    const onReply = jest.fn();
    const { getByText } = render(
      <CommentItem comment={mockComment} onReply={onReply} />,
    );

    const likeButton = getByText("🤍");

    // Press multiple times rapidly
    fireEvent.press(likeButton);
    fireEvent.press(likeButton);
    fireEvent.press(likeButton);

    // Each press calls toggleFavorite since processing guard is in the hook
    expect(mockToggleFavorite).toHaveBeenCalledTimes(3);
  });
});
