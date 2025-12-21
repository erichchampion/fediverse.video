import type { Post } from "@types";
import { attemptScrollRestore } from "../scrollRestore";

const createMockAccount = () => ({
  id: "acct-1",
  username: "tester",
  acct: "tester",
  displayName: "Tester",
  avatar: "https://example.com/avatar.png",
  header: "https://example.com/header.png",
  followersCount: 0,
  followingCount: 0,
  statusesCount: 0,
  note: "",
  url: "https://example.com/@tester",
  createdAt: "2024-01-01T00:00:00Z",
});

const createPost = (id: string): Post => ({
  id,
  uri: `https://example.com/${id}`,
  createdAt: "2024-01-01T00:00:00Z",
  account: createMockAccount(),
  content: "content",
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
  reblog: null,
});

describe("attemptScrollRestore", () => {
  it("scrolls immediately when a layout exists", async () => {
    const targetPost = createPost("post-1");
    const postLayouts = new Map([[targetPost.id, { y: 120, height: 400 }]]);
    const scrollTo = jest.fn();

    const result = await attemptScrollRestore({
      targetPostId: targetPost.id,
      postLayouts,
      displayPosts: [targetPost],
      posts: [targetPost],
      averagePostHeight: 300,
      scrollTo,
      delayMs: 0,
      maxAttempts: 1,
    });

    expect(scrollTo).toHaveBeenCalledWith(120);
    expect(result).toEqual({ outcome: "exact", keepPending: false });
  });

  it("uses an estimated offset and keeps pending when layout is not ready but the post is present", async () => {
    const posts = [
      createPost("post-1"),
      createPost("post-2"),
      createPost("post-3"),
    ];
    const scrollTo = jest.fn();

    const promise = attemptScrollRestore({
      targetPostId: "post-3",
      postLayouts: new Map(),
      displayPosts: posts,
      posts,
      averagePostHeight: 250,
      scrollTo,
      delayMs: 0,
      maxAttempts: 1,
    });

    const result = await promise;

    expect(scrollTo).not.toHaveBeenCalled();
    expect(result).toEqual({
      outcome: "pending-layout",
      keepPending: true,
    });
  });

  it("returns missing without scrolling when the post cannot be found", async () => {
    const scrollTo = jest.fn();

    const promise = attemptScrollRestore({
      targetPostId: "missing-post",
      postLayouts: new Map(),
      displayPosts: [],
      posts: [],
      averagePostHeight: 200,
      scrollTo,
      delayMs: 0,
      maxAttempts: 1,
    });

    const result = await promise;

    expect(scrollTo).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: "missing", keepPending: true });
  });
});
