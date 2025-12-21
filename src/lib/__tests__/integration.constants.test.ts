/**
 * Integration tests for constants usage
 * Verifies that constants are properly imported and used across the codebase
 */

import {
  FEED_CONFIG,
  API_LIMITS,
  UI_CONFIG,
  VIRTUAL_SCROLL_UI_CONFIG,
} from "@/config";
import {
  CACHE_EXPIRATION,
  RELATIONSHIP_BATCHER_CONFIG,
  REQUEST_CACHE_CONFIG,
} from "@lib/storage/constants";
import { stripHtml, getContentPreview } from "@lib/utils/html";

describe("Constants Integration", () => {
  describe("Feed Configuration", () => {
    it("should have DEFAULT_PAGE_SIZE defined", () => {
      expect(FEED_CONFIG.DEFAULT_PAGE_SIZE).toBe(20);
    });

    it("should be usable in limit calculations", () => {
      const limit = FEED_CONFIG.DEFAULT_PAGE_SIZE;
      expect(limit).toBeGreaterThan(0);
      expect(Number.isInteger(limit)).toBe(true);
    });
  });

  describe("API Limits", () => {
    it("should have all API limits defined", () => {
      expect(API_LIMITS.FOLLOWED_ACCOUNTS).toBe(80);
      expect(API_LIMITS.FOLLOWED_HASHTAGS).toBe(80);
      expect(API_LIMITS.TRENDING_HASHTAGS).toBe(5);
    });
  });

  describe("UI Configuration", () => {
    it("should have all UI config values defined", () => {
      expect(UI_CONFIG.CONTENT_PREVIEW_LENGTH).toBe(100);
      expect(UI_CONFIG.PROFILE_BIO_MAX_LENGTH).toBe(500);
      expect(UI_CONFIG.PROFILE_DISPLAY_NAME_MAX_LENGTH).toBe(30);
      expect(UI_CONFIG.PROFILE_MAX_FIELDS).toBe(4);
    });

    it("should have delay values in milliseconds", () => {
      expect(UI_CONFIG.VISIBILITY_UPDATE_INTERVAL).toBe(2000);
      expect(UI_CONFIG.SCROLL_DEBOUNCE_DELAY).toBe(1000);
      expect(UI_CONFIG.SCROLL_RECOVERY_DELAY).toBe(100);
    });
  });

  describe("Virtual Scroll Configuration", () => {
    it("should have all virtual scroll config values defined", () => {
      // Optimized values to prevent blank screens and VirtualizedList warnings
      // Updated for better stability when loading more posts
      expect(VIRTUAL_SCROLL_UI_CONFIG.INITIAL_NUM_TO_RENDER).toBe(10);
      expect(VIRTUAL_SCROLL_UI_CONFIG.MAX_TO_RENDER_PER_BATCH).toBe(5); // Increased from 3 for smoother loading
      expect(VIRTUAL_SCROLL_UI_CONFIG.WINDOW_SIZE).toBe(21); // Increased from 10 to prevent window resets
      expect(VIRTUAL_SCROLL_UI_CONFIG.UPDATE_CELLS_BATCHING_PERIOD).toBe(200); // Increased from 50ms
      expect(VIRTUAL_SCROLL_UI_CONFIG.ITEM_VISIBLE_PERCENT_THRESHOLD).toBe(50);
      expect(VIRTUAL_SCROLL_UI_CONFIG.MINIMUM_VIEW_TIME).toBe(200);
    });
  });

  describe("Cache Configuration", () => {
    it("should have cache expiration times defined", () => {
      expect(CACHE_EXPIRATION.FEED).toBe(60 * 60 * 1000);
      expect(CACHE_EXPIRATION.RELATIONSHIPS).toBe(30 * 60 * 1000);
    });
  });

  describe("Relationship Batcher Configuration", () => {
    it("should have relationship batcher config defined", () => {
      expect(RELATIONSHIP_BATCHER_CONFIG.BATCH_SIZE).toBe(40);
      expect(RELATIONSHIP_BATCHER_CONFIG.BATCH_DELAY).toBe(50);
      expect(RELATIONSHIP_BATCHER_CONFIG.MAX_BATCH_INTERVAL).toBe(2000);
    });
  });

  describe("Request Cache Configuration", () => {
    it("should have request cache config defined", () => {
      expect(REQUEST_CACHE_CONFIG.CLEAR_DELAY).toBe(5000);
      expect(REQUEST_CACHE_CONFIG.DRAIN_CHECK_INTERVAL).toBe(100);
    });
  });

  describe("HTML Utilities Integration", () => {
    it("should use UI_CONFIG.CONTENT_PREVIEW_LENGTH by default", () => {
      const html = "<p>" + "a".repeat(200) + "</p>";
      const preview = getContentPreview(html);
      expect(preview.length).toBe(UI_CONFIG.CONTENT_PREVIEW_LENGTH);
    });

    it("should work with stripHtml and getContentPreview together", () => {
      const html = "<p>Hello <strong>world</strong>!</p>";
      const stripped = stripHtml(html);
      const preview = getContentPreview(html, 10);

      expect(stripped).toBe("Hello world!");
      expect(preview).toBe("Hello worl");
      expect(preview.length).toBe(10);
    });
  });

  describe("Constants Type Safety", () => {
    it("should have readonly constants (as const)", () => {
      // TypeScript should prevent mutation, but we can verify values are correct
      expect(typeof FEED_CONFIG.DEFAULT_PAGE_SIZE).toBe("number");
      expect(typeof UI_CONFIG.CONTENT_PREVIEW_LENGTH).toBe("number");
      expect(typeof API_LIMITS.FOLLOWED_ACCOUNTS).toBe("number");
    });
  });
});
