import type { mastodon } from "masto";
import type {
  Post,
  User,
  MediaAttachment,
  Card,
  TimelineOptions,
} from "@types";
import { FEED_CONFIG } from "@/config";
import { stripHtml } from "@lib/utils/html";

/**
 * Timeline API helpers
 * Phase 3: Feed System
 */

/**
 * Transform Mastodon API account to our User type
 */
export function transformAccount(account: mastodon.v1.Account): User {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName || account.username,
    avatar: account.avatar,
    header: account.header || "",
    followersCount: account.followersCount || 0,
    followingCount: account.followingCount || 0,
    statusesCount: account.statusesCount || 0,
  };
}

/**
 * Transform Mastodon API media attachment to our MediaAttachment type
 */
export function transformMediaAttachment(
  media: mastodon.v1.MediaAttachment,
): MediaAttachment {
  return {
    id: media.id,
    type: media.type as "image" | "video" | "gifv" | "audio",
    url: media.url || "",
    previewUrl: media.previewUrl || media.url || "",
    description: media.description || null,
    blurhash: media.blurhash || null,
    meta: media.meta
      ? {
          original: media.meta.original
            ? {
                width: media.meta.original.width,
                height: media.meta.original.height,
                aspect: media.meta.original.aspect,
                size: media.meta.original.size,
                duration: media.meta.original.duration,
                bitrate: media.meta.original.bitrate,
              }
            : undefined,
          small: media.meta.small
            ? {
                width: media.meta.small.width,
                height: media.meta.small.height,
                aspect: media.meta.small.aspect,
                size: media.meta.small.size,
                duration: media.meta.small.duration,
                bitrate: media.meta.small.bitrate,
              }
            : undefined,
          focus: media.meta.focus
            ? {
                x: media.meta.focus.x,
                y: media.meta.focus.y,
              }
            : undefined,
        }
      : undefined,
  };
}

/**
 * Transform Mastodon API preview card to our Card type
 */
export function transformCard(card: mastodon.v1.PreviewCard): Card {
  return {
    url: card.url,
    title: card.title,
    description: card.description,
    type: card.type as "link" | "photo" | "video" | "rich",
    authorName: card.authorName || undefined,
    authorUrl: card.authorUrl || undefined,
    providerName: card.providerName || undefined,
    providerUrl: card.providerUrl || undefined,
    html: card.html || undefined,
    width: card.width || undefined,
    height: card.height || undefined,
    image: card.image || undefined,
    embedUrl: card.embedUrl || undefined,
    blurhash: card.blurhash || undefined,
  };
}

/**
 * Transform Mastodon API status to our Post type
 */
export function transformStatus(status: mastodon.v1.Status): Post {
  const post: Post = {
    id: status.id,
    content: status.content || "",
    createdAt: status.createdAt,
    account: transformAccount(status.account),
    mediaAttachments:
      status.mediaAttachments?.map(transformMediaAttachment) || [],
    favouritesCount: status.favouritesCount || 0,
    reblogsCount: status.reblogsCount || 0,
    repliesCount: status.repliesCount || 0,
    favourited: status.favourited || false,
    reblogged: status.reblogged || false,
    bookmarked: status.bookmarked || false,
    sensitive: status.sensitive || false,
    spoilerText: status.spoilerText || "",
    visibility: status.visibility as
      | "public"
      | "unlisted"
      | "private"
      | "direct",
    url: status.url || undefined,
    inReplyToId: status.inReplyToId || null,
    inReplyToAccountId: status.inReplyToAccountId || null,
    reblog: status.reblog ? transformStatus(status.reblog) : null,
    card: status.card ? transformCard(status.card) : null,
    tags: status.tags || [],
    mentions: status.mentions || [],
    emojis: status.emojis || [],
    uri: status.uri,
  };

  return post;
}

/**
 * Convert our TimelineOptions to Mastodon API parameters
 */
export function convertTimelineOptions(
  options?: TimelineOptions,
): mastodon.rest.v1.ListTimelineParams {
  if (!options) return { limit: FEED_CONFIG.DEFAULT_PAGE_SIZE };

  return {
    maxId: options.maxId,
    minId: options.minId,
    sinceId: options.sinceId,
    limit: options.limit || FEED_CONFIG.DEFAULT_PAGE_SIZE,
  };
}

/**
 * Strip HTML tags from content (for preview text)
 * Re-exported from utils for backward compatibility
 */
export { stripHtml } from "@lib/utils/html";

/**
 * Get display content (handles boosts/reblogs)
 */
export function getDisplayPost(post: Post): Post {
  // If this is a boost, return the original post
  return post.reblog || post;
}

/**
 * Get plain text content from post
 */
export function getPlainTextContent(post: Post): string {
  const displayPost = getDisplayPost(post);
  return stripHtml(displayPost.content);
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return `${seconds}s`;
  } else if (minutes < 60) {
    return `${minutes}m`;
  } else if (hours < 24) {
    return `${hours}h`;
  } else if (days < 7) {
    return `${days}d`;
  } else {
    // Format as date
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
}

/**
 * Get full formatted date
 */
export function formatFullDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
