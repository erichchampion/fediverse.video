/**
 * PostCard Reply Integration Tests
 * Testing the complete reply flow from PostCard
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { PostCard } from "../PostCard";
import type { Post } from "@types";

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
      error: "#E0245E",
      success: "#17BF63",
    },
  }),
}));

jest.mock("@contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "currentuser",
      username: "currentuser",
      displayName: "Current User",
      avatar: "https://example.com/avatar.jpg",
    },
  }),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

jest.mock("@lib/api/client");

jest.mock("@components/base", () => ({
  Avatar: () => null,
  AnimatedTouchableScale: ({ children, onPress, testID }: any) => {
    const { TouchableOpacity } = require("react-native");
    return (
      <TouchableOpacity onPress={onPress} testID={testID}>
        {children}
      </TouchableOpacity>
    );
  },
  RichText: ({ content }: any) => {
    const { Text } = require("react-native");
    return <Text>{content}</Text>;
  },
}));

jest.mock("@components/media", () => ({
  MediaGrid: () => null,
}));

jest.mock("@lib/api/timeline", () => ({
  getDisplayPost: (post: any) => post.reblog || post,
  getPlainTextContent: (post: any) =>
    post.content?.replace(/<[^>]*>/g, "") || "",
  formatTimestamp: () => "1h",
  stripHtml: (text: string) => text.replace(/<[^>]*>/g, ""),
}));

jest.mock("../PostHeader", () => ({
  PostHeader: ({ onReply, account, postId }: any) => {
    const { TouchableOpacity, Text, View } = require("react-native");
    return (
      <View>
        <Text>{account.displayName}</Text>
        <TouchableOpacity onPress={onReply} testID="header-reply-button">
          <Text>Reply from Header</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

const mockPost: Post = {
  id: "post123",
  content: "<p>This is a test post about <strong>React Native</strong></p>",
  createdAt: "2024-01-01T12:00:00.000Z",
  account: {
    id: "user1",
    username: "testuser",
    acct: "testuser",
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
  url: "https://mastodon.social/@testuser/post123",
  reblog: null,
  inReplyToId: null,
  inReplyToAccountId: null,
  tags: [],
  mentions: [],
  emojis: [],
  uri: "https://mastodon.social/users/testuser/statuses/post123",
};

describe("PostCard Reply Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should navigate to compose modal when reply is triggered from header", () => {
    const { getByTestId } = render(<PostCard post={mockPost} />);

    const replyButton = getByTestId("header-reply-button");
    fireEvent.press(replyButton);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/modals/compose"),
    );
  });

  it("should include correct post ID in reply navigation", () => {
    const { getByTestId } = render(<PostCard post={mockPost} />);

    const replyButton = getByTestId("header-reply-button");
    fireEvent.press(replyButton);

    const navigationUrl = mockPush.mock.calls[0][0];
    expect(navigationUrl).toContain("replyToId=post123");
  });

  it("should include username in reply navigation", () => {
    const { getByTestId } = render(<PostCard post={mockPost} />);

    const replyButton = getByTestId("header-reply-button");
    fireEvent.press(replyButton);

    const navigationUrl = mockPush.mock.calls[0][0];
    expect(navigationUrl).toContain("replyToUsername=testuser");
  });

  it("should include stripped HTML content in reply navigation", () => {
    const { getByTestId } = render(<PostCard post={mockPost} />);

    const replyButton = getByTestId("header-reply-button");
    fireEvent.press(replyButton);

    const navigationUrl = mockPush.mock.calls[0][0];

    // Should use correct route path
    expect(navigationUrl).toContain("/modals/compose");

    // Should include text content without HTML tags (URL encoded with +)
    expect(navigationUrl).toContain("This+is+a+test+post");
    expect(navigationUrl).toContain("React+Native");

    // Should not include HTML tags
    expect(navigationUrl).not.toContain("<p>");
    expect(navigationUrl).not.toContain("<strong>");
  });

  it("should handle reply for boosted posts correctly", () => {
    const boostedPost: Post = {
      ...mockPost,
      id: "boost456",
      reblog: {
        ...mockPost,
        id: "original123",
        account: {
          ...mockPost.account,
          username: "originaluser",
          displayName: "Original User",
        },
      },
    };

    const { getByTestId } = render(<PostCard post={boostedPost} />);

    const replyButton = getByTestId("header-reply-button");
    fireEvent.press(replyButton);

    const navigationUrl = mockPush.mock.calls[0][0];

    // Should use the reblog (original) post data, not the boost
    expect(navigationUrl).toContain("replyToId=original123");
    expect(navigationUrl).toContain("replyToUsername=originaluser");
  });

  it("should handle posts with long content by truncating", () => {
    const longPost: Post = {
      ...mockPost,
      content: "<p>" + "A".repeat(500) + "</p>",
    };

    const { getByTestId } = render(<PostCard post={longPost} />);

    const replyButton = getByTestId("header-reply-button");
    fireEvent.press(replyButton);

    // Navigation should succeed even with long content
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("should handle posts with special characters in content", () => {
    const specialPost: Post = {
      ...mockPost,
      content: "<p>Test with &amp; &lt; &gt; &quot; chars</p>",
    };

    const { getByTestId } = render(<PostCard post={specialPost} />);

    const replyButton = getByTestId("header-reply-button");
    fireEvent.press(replyButton);

    expect(mockPush).toHaveBeenCalledTimes(1);
    const navigationUrl = mockPush.mock.calls[0][0];
    expect(navigationUrl).toContain("Test+with");
  });

  it("should handle posts with empty content", () => {
    const emptyPost: Post = {
      ...mockPost,
      content: "",
    };

    const { getByTestId } = render(<PostCard post={emptyPost} />);

    const replyButton = getByTestId("header-reply-button");
    fireEvent.press(replyButton);

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("should handle federated account usernames", () => {
    const federatedPost: Post = {
      ...mockPost,
      account: {
        ...mockPost.account,
        acct: "testuser@example.com",
      },
    };

    const { getByTestId } = render(<PostCard post={federatedPost} />);

    const replyButton = getByTestId("header-reply-button");
    fireEvent.press(replyButton);

    const navigationUrl = mockPush.mock.calls[0][0];
    expect(navigationUrl).toContain("replyToUsername=testuser");
  });

  it("should render without errors for valid posts", () => {
    const { getByText } = render(<PostCard post={mockPost} />);

    expect(getByText("Test User")).toBeTruthy();
  });

  it("should return null for invalid post data", () => {
    // @ts-ignore - intentionally passing invalid data
    const { toJSON } = render(<PostCard post={null} />);

    // Component should return null, resulting in null JSON
    expect(toJSON()).toBeNull();
  });

  it("should return null for post without account data", () => {
    const invalidPost = {
      ...mockPost,
      account: null,
    };

    // @ts-ignore - intentionally passing invalid data
    const { toJSON } = render(<PostCard post={invalidPost} />);

    // Component should return null, resulting in null JSON
    expect(toJSON()).toBeNull();
  });
});
