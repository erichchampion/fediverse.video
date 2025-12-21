/**
 * Timeline API Tests
 * Phase 8: Testing & Release
 */

import {
  transformStatus,
  transformAccount,
  stripHtml,
  formatTimestamp,
} from "../timeline";

describe("transformStatus", () => {
  it("should transform a basic status correctly", () => {
    const mockStatus = {
      id: "123",
      content: "<p>Hello world</p>",
      createdAt: "2024-01-01T12:00:00.000Z",
      account: {
        id: "user1",
        username: "testuser",
        displayName: "Test User",
        avatar: "https://example.com/avatar.jpg",
        header: "https://example.com/header.jpg",
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
      url: "https://example.com/status/123",
      reblog: null,
      inReplyToId: null,
      inReplyToAccountId: null,
    };

    const result = transformStatus(mockStatus as any);

    expect(result.id).toBe("123");
    expect(result.content).toBe("<p>Hello world</p>");
    expect(result.account.username).toBe("testuser");
    expect(result.favouritesCount).toBe(5);
    expect(result.reblog).toBeNull();
  });

  it("should handle boosts/reblogs correctly", () => {
    const mockStatus = {
      id: "456",
      content: "",
      createdAt: "2024-01-01T12:00:00.000Z",
      account: {
        id: "user2",
        username: "booster",
        displayName: "Booster",
        avatar: "https://example.com/avatar2.jpg",
        header: "",
        followersCount: 50,
        followingCount: 25,
        statusesCount: 100,
      },
      mediaAttachments: [],
      favouritesCount: 0,
      reblogsCount: 0,
      repliesCount: 0,
      favourited: false,
      reblogged: true,
      bookmarked: false,
      sensitive: false,
      spoilerText: "",
      visibility: "public",
      url: "https://example.com/status/456",
      reblog: {
        id: "123",
        content: "<p>Original post</p>",
        createdAt: "2024-01-01T11:00:00.000Z",
        account: {
          id: "user1",
          username: "original",
          displayName: "Original",
          avatar: "https://example.com/avatar1.jpg",
          header: "",
          followersCount: 100,
          followingCount: 50,
          statusesCount: 200,
        },
        mediaAttachments: [],
        favouritesCount: 10,
        reblogsCount: 5,
        repliesCount: 2,
        favourited: false,
        reblogged: false,
        bookmarked: false,
        sensitive: false,
        spoilerText: "",
        visibility: "public",
        url: "https://example.com/status/123",
        reblog: null,
        inReplyToId: null,
        inReplyToAccountId: null,
      },
      inReplyToId: null,
      inReplyToAccountId: null,
    };

    const result = transformStatus(mockStatus as any);

    expect(result.reblog).not.toBeNull();
    expect(result.reblog?.id).toBe("123");
    expect(result.reblog?.content).toBe("<p>Original post</p>");
    expect(result.reblog?.account.username).toBe("original");
  });
});

describe("stripHtml", () => {
  it("should remove HTML tags", () => {
    expect(stripHtml("<p>Hello world</p>")).toBe("Hello world");
    expect(stripHtml("<div><p>Test</p></div>")).toBe("Test");
  });

  it("should convert <br> to newlines", () => {
    expect(stripHtml("Line 1<br>Line 2")).toBe("Line 1\nLine 2");
    expect(stripHtml("Line 1<br/>Line 2")).toBe("Line 1\nLine 2");
  });

  it("should convert </p> to double newlines", () => {
    expect(stripHtml("<p>Para 1</p><p>Para 2</p>")).toBe("Para 1\n\nPara 2");
  });

  it("should decode HTML entities", () => {
    expect(stripHtml("&lt;hello&gt;")).toBe("<hello>");
    expect(stripHtml("&amp; &quot;")).toBe('& "');
  });

  it("should trim whitespace", () => {
    expect(stripHtml("  <p>Test</p>  ")).toBe("Test");
  });
});

describe("formatTimestamp", () => {
  it("should format recent timestamps correctly", () => {
    const now = new Date();

    // 5 minutes ago
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(formatTimestamp(fiveMinAgo.toISOString())).toBe("5m");

    // 2 hours ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(formatTimestamp(twoHoursAgo.toISOString())).toBe("2h");

    // 3 days ago
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatTimestamp(threeDaysAgo.toISOString())).toBe("3d");
  });

  it("should format old timestamps as dates", () => {
    const oldDate = new Date("2023-01-15T12:00:00.000Z");
    const result = formatTimestamp(oldDate.toISOString());
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});

describe("transformAccount", () => {
  it("should transform account correctly", () => {
    const mockAccount = {
      id: "user1",
      username: "testuser",
      displayName: "Test User",
      avatar: "https://example.com/avatar.jpg",
      header: "https://example.com/header.jpg",
      followersCount: 100,
      followingCount: 50,
      statusesCount: 200,
    };

    const result = transformAccount(mockAccount as any);

    expect(result.id).toBe("user1");
    expect(result.username).toBe("testuser");
    expect(result.displayName).toBe("Test User");
    expect(result.followersCount).toBe(100);
  });

  it("should handle missing displayName", () => {
    const mockAccount = {
      id: "user1",
      username: "testuser",
      displayName: "",
      avatar: "https://example.com/avatar.jpg",
      header: "",
      followersCount: 0,
      followingCount: 0,
      statusesCount: 0,
    };

    const result = transformAccount(mockAccount as any);

    expect(result.displayName).toBe("testuser");
  });
});
