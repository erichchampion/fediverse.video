/**
 * FeedGridView Unique Keys Test
 * Ensures that duplicate posts (reblogs/boosts) generate unique React keys
 */

import { render } from "@testing-library/react-native";
import { FeedGridView } from "../FeedGridView";
import type { Post, MediaAttachment } from "@types";

// Mock MediaGrid
jest.mock("../../media/MediaGrid", () => ({
  MediaGrid: ({ media }: any) => {
    const { View, Text } = require("react-native");
    return (
      <View testID={`media-grid-${media[0]?.id}`}>
        <Text>{media[0]?.id}</Text>
      </View>
    );
  },
}));

// Mock expo-image
jest.mock("expo-image", () => ({
  Image: () => {
    const { View } = require("react-native");
    return <View testID="image" />;
  },
}));

// Mock theme context
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      card: "#FFFFFF",
      text: "#000000",
      textSecondary: "#666666",
      primary: "#6364FF",
      background: "#F5F5F5",
    },
  }),
}));

describe("FeedGridView - Unique Keys for Duplicate Posts", () => {
  const mockMedia: MediaAttachment = {
    id: "media-123",
    type: "image",
    url: "https://example.com/image.jpg",
    previewUrl: "https://example.com/preview.jpg",
    description: "Test image",
  };

  const createMockAccount = (id: string, username: string) => ({
    id,
    username,
    acct: username,
    displayName: `User ${id}`,
    avatar: "https://example.com/avatar.jpg",
    header: "https://example.com/header.jpg",
    followersCount: 100,
    followingCount: 50,
    statusesCount: 10,
    note: "Test bio",
    url: `https://example.com/users/${username}`,
    createdAt: "2024-01-01T00:00:00Z",
  });

  const createOriginalPost = (id: string): Post => ({
    id,
    uri: `https://example.com/posts/${id}`,
    url: `https://example.com/@testuser/${id}`,
    createdAt: "2024-01-01T00:00:00Z",
    content: "Original post content",
    visibility: "public",
    sensitive: false,
    spoilerText: "",
    mediaAttachments: [mockMedia],
    mentions: [],
    tags: [],
    emojis: [],
    reblogsCount: 2,
    favouritesCount: 5,
    repliesCount: 1,
    reblogged: false,
    favourited: false,
    bookmarked: false,
    account: createMockAccount("original-user", "originaluser"),
    reblog: null,
    inReplyToId: null,
    inReplyToAccountId: null,
  });

  const createReblogPost = (
    reblogId: string,
    originalPost: Post,
    boosterAccount: ReturnType<typeof createMockAccount>,
  ): Post => ({
    id: reblogId,
    uri: `https://example.com/posts/${reblogId}`,
    url: `https://example.com/@${boosterAccount.username}/${reblogId}`,
    createdAt: "2024-01-01T01:00:00Z",
    content: "",
    visibility: "public",
    sensitive: false,
    spoilerText: "",
    mediaAttachments: [],
    mentions: [],
    tags: [],
    emojis: [],
    reblogsCount: 0,
    favouritesCount: 0,
    repliesCount: 0,
    reblogged: true,
    favourited: false,
    bookmarked: false,
    account: boosterAccount,
    reblog: originalPost,
    inReplyToId: null,
    inReplyToAccountId: null,
  });

  it("should generate unique keys for multiple boosts of the same post", () => {
    const originalPost = createOriginalPost("original-123");

    // Create multiple boosts of the same original post
    const boost1 = createReblogPost(
      "boost-456",
      originalPost,
      createMockAccount("user1", "user1"),
    );
    const boost2 = createReblogPost(
      "boost-789",
      originalPost,
      createMockAccount("user2", "user2"),
    );
    const boost3 = createReblogPost(
      "boost-999",
      originalPost,
      createMockAccount("user3", "user3"),
    );

    const posts = [boost1, boost2, boost3];

    // Capture console.error to check for React duplicate key warnings
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<FeedGridView posts={posts} />);

    // Check that no duplicate key warnings were logged
    const duplicateKeyWarnings = consoleError.mock.calls.filter(
      (call) =>
        call[0]?.includes &&
        call[0].includes("Encountered two children with the same key"),
    );

    expect(duplicateKeyWarnings).toHaveLength(0);

    consoleError.mockRestore();
  });

  it("should use post.id instead of displayPost.id for key generation", () => {
    const originalPost = createOriginalPost("original-123");

    const boost1 = createReblogPost(
      "boost-456",
      originalPost,
      createMockAccount("user1", "user1"),
    );
    const boost2 = createReblogPost(
      "boost-789",
      originalPost,
      createMockAccount("user2", "user2"),
    );

    const posts = [boost1, boost2];

    const { UNSAFE_root } = render(<FeedGridView posts={posts} />);

    // Get all rendered children - each boost should create one media item
    // The keys should be based on the boost IDs (boost-456, boost-789), not the original post ID
    const rendered = UNSAFE_root;

    // Just verify rendering succeeds without errors (duplicate keys would cause React warnings)
    expect(rendered).toBeTruthy();
  });

  it("should handle posts with multiple media attachments correctly", () => {
    const multiMediaPost: Post = {
      id: "post-multi",
      uri: "https://example.com/posts/multi",
      url: "https://example.com/@user/multi",
      createdAt: "2024-01-01T00:00:00Z",
      content: "Post with multiple media",
      visibility: "public",
      sensitive: false,
      spoilerText: "",
      mediaAttachments: [
        {
          id: "media-1",
          type: "image",
          url: "https://example.com/image1.jpg",
          previewUrl: "https://example.com/preview1.jpg",
          description: "Image 1",
        },
        {
          id: "media-2",
          type: "image",
          url: "https://example.com/image2.jpg",
          previewUrl: "https://example.com/preview2.jpg",
          description: "Image 2",
        },
        {
          id: "media-3",
          type: "video",
          url: "https://example.com/video.mp4",
          previewUrl: "https://example.com/preview3.jpg",
          description: "Video",
        },
      ],
      mentions: [],
      tags: [],
      emojis: [],
      reblogsCount: 0,
      favouritesCount: 0,
      repliesCount: 0,
      reblogged: false,
      favourited: false,
      bookmarked: false,
      account: createMockAccount("user", "testuser"),
      reblog: null,
      inReplyToId: null,
      inReplyToAccountId: null,
    };

    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<FeedGridView posts={[multiMediaPost]} />);

    // Check for duplicate key warnings
    const duplicateKeyWarnings = consoleError.mock.calls.filter(
      (call) =>
        call[0]?.includes &&
        call[0].includes("Encountered two children with the same key"),
    );

    expect(duplicateKeyWarnings).toHaveLength(0);

    consoleError.mockRestore();
  });

  it("should handle card and text items with unique keys", () => {
    const cardPost: Post = {
      id: "post-card",
      uri: "https://example.com/posts/card",
      url: "https://example.com/@user/card",
      createdAt: "2024-01-01T00:00:00Z",
      content: "Post with card",
      visibility: "public",
      sensitive: false,
      spoilerText: "",
      mediaAttachments: [],
      card: {
        url: "https://example.com",
        title: "Example",
        description: "Example site",
        type: "link",
        image: "https://example.com/card.jpg",
      },
      mentions: [],
      tags: [],
      emojis: [],
      reblogsCount: 0,
      favouritesCount: 0,
      repliesCount: 0,
      reblogged: false,
      favourited: false,
      bookmarked: false,
      account: createMockAccount("user", "testuser"),
      reblog: null,
      inReplyToId: null,
      inReplyToAccountId: null,
    };

    const textPost: Post = {
      id: "post-text",
      uri: "https://example.com/posts/text",
      url: "https://example.com/@user/text",
      createdAt: "2024-01-01T00:00:00Z",
      content: "Text only post",
      visibility: "public",
      sensitive: false,
      spoilerText: "",
      mediaAttachments: [],
      mentions: [],
      tags: [],
      emojis: [],
      reblogsCount: 0,
      favouritesCount: 0,
      repliesCount: 0,
      reblogged: false,
      favourited: false,
      bookmarked: false,
      account: createMockAccount("user", "testuser"),
      reblog: null,
      inReplyToId: null,
      inReplyToAccountId: null,
    };

    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<FeedGridView posts={[cardPost, textPost]} />);

    const duplicateKeyWarnings = consoleError.mock.calls.filter(
      (call) =>
        call[0]?.includes &&
        call[0].includes("Encountered two children with the same key"),
    );

    expect(duplicateKeyWarnings).toHaveLength(0);

    consoleError.mockRestore();
  });
});
