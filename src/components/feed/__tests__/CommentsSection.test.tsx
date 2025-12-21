/**
 * CommentsSection Component Tests
 * Tests for collapsible comments section
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { CommentsSection } from "../CommentsSection";
import type { Post } from "@types";
import * as useCommentsModule from "@hooks/useComments";

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

jest.mock("../CommentItem", () => ({
  CommentItem: ({ comment, onReply }: any) => {
    const { View, Text, TouchableOpacity } = require("react-native");
    return (
      <View testID={`comment-${comment.id}`}>
        <Text>{comment.content}</Text>
        <TouchableOpacity
          onPress={() =>
            onReply(comment.id, comment.account.username, comment.content)
          }
        >
          <Text>Reply</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock("@hooks/useComments");

const mockUseComments = useCommentsModule.useComments as jest.MockedFunction<
  typeof useCommentsModule.useComments
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

describe("CommentsSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders collapsed by default", () => {
    mockUseComments.mockReturnValue({
      comments: [],
      isLoading: false,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText, queryByTestId } = render(
      <CommentsSection postId="123" repliesCount={0} />,
    );

    expect(getByText("Replies (0)")).toBeTruthy();
    expect(queryByTestId("comment-comment1")).toBeNull();
  });

  it("displays correct reply count", () => {
    mockUseComments.mockReturnValue({
      comments: [mockComment],
      isLoading: false,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText } = render(
      <CommentsSection postId="123" repliesCount={1} />,
    );

    expect(getByText("Replies (1)")).toBeTruthy();
  });

  it("shows pencil emoji in header", () => {
    mockUseComments.mockReturnValue({
      comments: [],
      isLoading: false,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText } = render(
      <CommentsSection postId="123" repliesCount={0} />,
    );

    expect(getByText("✏️")).toBeTruthy();
  });

  it("expands to show comments when header is pressed", async () => {
    mockUseComments.mockReturnValue({
      comments: [mockComment],
      isLoading: false,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText, getByTestId } = render(
      <CommentsSection postId="123" repliesCount={1} />,
    );

    const header = getByText("Replies (1)");
    fireEvent.press(header);

    await waitFor(() => {
      expect(getByTestId("comment-comment1")).toBeTruthy();
    });
  });

  it("collapses when header is pressed again", async () => {
    mockUseComments.mockReturnValue({
      comments: [mockComment],
      isLoading: false,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText, getByTestId, queryByTestId } = render(
      <CommentsSection postId="123" repliesCount={1} />,
    );

    const header = getByText("Replies (1)");

    // Expand
    fireEvent.press(header);
    await waitFor(() => {
      expect(getByTestId("comment-comment1")).toBeTruthy();
    });

    // Collapse
    fireEvent.press(header);
    await waitFor(() => {
      expect(queryByTestId("comment-comment1")).toBeNull();
    });
  });

  it("navigates to compose modal when pencil emoji is pressed", () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
    });

    mockUseComments.mockReturnValue({
      comments: [],
      isLoading: false,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText } = render(
      <CommentsSection postId="123" repliesCount={0} />,
    );

    const pencilButton = getByText("✏️");
    fireEvent.press(pencilButton);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("replyToId=123"),
    );
  });

  it("shows loading state", () => {
    mockUseComments.mockReturnValue({
      comments: [],
      isLoading: true,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText } = render(
      <CommentsSection postId="123" repliesCount={0} />,
    );

    // Expand to see loading state
    const header = getByText("Replies (0)");
    fireEvent.press(header);

    expect(getByText(/loading/i)).toBeTruthy();
  });

  it("shows error state", () => {
    mockUseComments.mockReturnValue({
      comments: [],
      isLoading: false,
      error: "Failed to load comments",
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText } = render(
      <CommentsSection postId="123" repliesCount={0} />,
    );

    // Expand to see error state
    const header = getByText("Replies (0)");
    fireEvent.press(header);

    expect(getByText("Failed to load comments")).toBeTruthy();
  });

  it('shows "No replies yet" when there are no comments', () => {
    mockUseComments.mockReturnValue({
      comments: [],
      isLoading: false,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText } = render(
      <CommentsSection postId="123" repliesCount={0} />,
    );

    // Expand
    const header = getByText("Replies (0)");
    fireEvent.press(header);

    expect(getByText("No replies yet")).toBeTruthy();
  });

  it("renders multiple comments", async () => {
    const comments = [
      mockComment,
      { ...mockComment, id: "comment2" },
      { ...mockComment, id: "comment3" },
    ];

    mockUseComments.mockReturnValue({
      comments,
      isLoading: false,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText, getByTestId } = render(
      <CommentsSection postId="123" repliesCount={3} />,
    );

    // Expand
    const header = getByText("Replies (3)");
    fireEvent.press(header);

    await waitFor(() => {
      expect(getByTestId("comment-comment1")).toBeTruthy();
      expect(getByTestId("comment-comment2")).toBeTruthy();
      expect(getByTestId("comment-comment3")).toBeTruthy();
    });
  });

  it("updates reply count when onCommentCountUpdate is called", () => {
    const onCommentCountUpdate = jest.fn();
    mockUseComments.mockReturnValue({
      comments: [mockComment],
      isLoading: false,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    render(
      <CommentsSection
        postId="123"
        repliesCount={0}
        onCommentCountUpdate={onCommentCountUpdate}
      />,
    );

    // The hook should have been called with the onCommentCountUpdate callback
    expect(mockUseComments).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: "123",
        onCommentCountUpdate,
      }),
    );
  });

  it("handles reply to comment navigation", async () => {
    const mockPush = jest.fn();
    jest.spyOn(require("expo-router"), "useRouter").mockReturnValue({
      push: mockPush,
    });

    mockUseComments.mockReturnValue({
      comments: [mockComment],
      isLoading: false,
      error: null,
      createComment: jest.fn(),
      refreshComments: jest.fn(),
      removeComment: jest.fn(),
    });

    const { getByText } = render(
      <CommentsSection postId="123" repliesCount={1} />,
    );

    // Expand
    const header = getByText("Replies (1)");
    fireEvent.press(header);

    await waitFor(() => {
      const replyButton = getByText("Reply");
      fireEvent.press(replyButton);
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("replyToId=comment1"),
    );
  });
});
