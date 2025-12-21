/**
 * HTML utility functions
 * Centralized functions for HTML processing
 */

import { UI_CONFIG } from "@/config";

/**
 * Strip HTML tags from string and convert to plain text
 * Handles common HTML entities and formatting
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Get content preview (first N characters of plain text)
 */
export function getContentPreview(
  html: string,
  maxLength: number = UI_CONFIG.CONTENT_PREVIEW_LENGTH,
): string {
  return stripHtml(html).substring(0, maxLength);
}
