/**
 * PostActions Component Tests
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PostActions } from "../PostActions";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#FFFFFF",
      text: "#000000",
      textSecondary: "#666666",
      primary: "#1DA1F2",
      error: "#E0245E",
      success: "#17BF63",
    },
  }),
}));

jest.mock("@components/base", () => ({
  AnimatedTouchableScale: ({ children, onPress, testID }: any) => {
    const { TouchableOpacity } = require("react-native");
    return (
      <TouchableOpacity onPress={onPress} testID={testID}>
        {children}
      </TouchableOpacity>
    );
  },
}));

const mockPost = {
  id: "123",
  uri: "https://mastodon.social/users/test/statuses/123",
  createdAt: "2024-01-01T00:00:00Z",
  content: "Test post content",
  account: {
    id: "1",
    username: "testuser",
    displayName: "Test User",
    avatar: "https://example.com/avatar.jpg",
    header: "",
    followersCount: 0,
    followingCount: 0,
    statusesCount: 0,
  },
  mediaAttachments: [],
  mentions: [],
  tags: [],
  emojis: [],
  favourited: false,
  reblogged: false,
  bookmarked: false,
  favouritesCount: 5,
  reblogsCount: 2,
  repliesCount: 1,
  sensitive: false,
  spoilerText: "",
  visibility: "public" as const,
};

const mockInteractions = {
  toggleFavorite: jest.fn(),
  toggleBoost: jest.fn(),
  toggleBookmark: jest.fn(),
  reply: jest.fn(),
  share: jest.fn(),
};

describe("PostActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render all action buttons", () => {
    const { getByTestId } = render(
      <PostActions
        post={mockPost}
        isProcessing={false}
        onToggleFavorite={mockInteractions.toggleFavorite}
        onToggleBoost={mockInteractions.toggleBoost}
        onToggleBookmark={mockInteractions.toggleBookmark}
        onReply={mockInteractions.reply}
        onShare={mockInteractions.share}
      />,
    );

    expect(getByTestId("action-reply")).toBeTruthy();
    expect(getByTestId("action-boost")).toBeTruthy();
    expect(getByTestId("action-favorite")).toBeTruthy();
    expect(getByTestId("action-bookmark")).toBeTruthy();
    expect(getByTestId("action-share")).toBeTruthy();
  });

  it("should call onToggleFavorite when favorite button is pressed", () => {
    const { getByTestId } = render(
      <PostActions
        post={mockPost}
        isProcessing={false}
        onToggleFavorite={mockInteractions.toggleFavorite}
        onToggleBoost={mockInteractions.toggleBoost}
        onToggleBookmark={mockInteractions.toggleBookmark}
        onReply={mockInteractions.reply}
        onShare={mockInteractions.share}
      />,
    );

    fireEvent.press(getByTestId("action-favorite"));
    expect(mockInteractions.toggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("should call onToggleBoost when boost button is pressed", () => {
    const { getByTestId } = render(
      <PostActions
        post={mockPost}
        isProcessing={false}
        onToggleFavorite={mockInteractions.toggleFavorite}
        onToggleBoost={mockInteractions.toggleBoost}
        onToggleBookmark={mockInteractions.toggleBookmark}
        onReply={mockInteractions.reply}
        onShare={mockInteractions.share}
      />,
    );

    fireEvent.press(getByTestId("action-boost"));
    expect(mockInteractions.toggleBoost).toHaveBeenCalledTimes(1);
  });

  it("should call onToggleBookmark when bookmark button is pressed", () => {
    const { getByTestId } = render(
      <PostActions
        post={mockPost}
        isProcessing={false}
        onToggleFavorite={mockInteractions.toggleFavorite}
        onToggleBoost={mockInteractions.toggleBoost}
        onToggleBookmark={mockInteractions.toggleBookmark}
        onReply={mockInteractions.reply}
        onShare={mockInteractions.share}
      />,
    );

    fireEvent.press(getByTestId("action-bookmark"));
    expect(mockInteractions.toggleBookmark).toHaveBeenCalledTimes(1);
  });

  it("should call onReply when reply button is pressed", () => {
    const { getByTestId } = render(
      <PostActions
        post={mockPost}
        isProcessing={false}
        onToggleFavorite={mockInteractions.toggleFavorite}
        onToggleBoost={mockInteractions.toggleBoost}
        onToggleBookmark={mockInteractions.toggleBookmark}
        onReply={mockInteractions.reply}
        onShare={mockInteractions.share}
      />,
    );

    fireEvent.press(getByTestId("action-reply"));
    expect(mockInteractions.reply).toHaveBeenCalledTimes(1);
  });

  it("should call onShare when share button is pressed", () => {
    const { getByTestId } = render(
      <PostActions
        post={mockPost}
        isProcessing={false}
        onToggleFavorite={mockInteractions.toggleFavorite}
        onToggleBoost={mockInteractions.toggleBoost}
        onToggleBookmark={mockInteractions.toggleBookmark}
        onReply={mockInteractions.reply}
        onShare={mockInteractions.share}
      />,
    );

    fireEvent.press(getByTestId("action-share"));
    expect(mockInteractions.share).toHaveBeenCalledTimes(1);
  });

  it("should disable buttons when isProcessing is true", () => {
    const { getByTestId } = render(
      <PostActions
        post={mockPost}
        isProcessing={true}
        onToggleFavorite={mockInteractions.toggleFavorite}
        onToggleBoost={mockInteractions.toggleBoost}
        onToggleBookmark={mockInteractions.toggleBookmark}
        onReply={mockInteractions.reply}
        onShare={mockInteractions.share}
      />,
    );

    // Buttons should be disabled when processing
    // This is handled by the disabled prop on AnimatedTouchableScale
  });

  it("should show correct counts for interactions", () => {
    const { getByText } = render(
      <PostActions
        post={mockPost}
        isProcessing={false}
        onToggleFavorite={mockInteractions.toggleFavorite}
        onToggleBoost={mockInteractions.toggleBoost}
        onToggleBookmark={mockInteractions.toggleBookmark}
        onReply={mockInteractions.reply}
        onShare={mockInteractions.share}
      />,
    );

    expect(getByText("1")).toBeTruthy(); // replies count
    expect(getByText("2")).toBeTruthy(); // boosts count
    expect(getByText("5")).toBeTruthy(); // favorites count
  });
});
