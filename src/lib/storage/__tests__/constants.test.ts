/**
 * Tests for storage constants
 */

import {
  CACHE_VERSION,
  CACHE_EXPIRATION,
  STORAGE_LIMITS,
  REQUEST_QUEUE_CONFIG,
  VIRTUAL_SCROLL_CONFIG,
  RELATIONSHIP_BATCHER_CONFIG,
  REQUEST_CACHE_CONFIG,
} from "../constants";

describe("Storage Constants", () => {
  describe("CACHE_VERSION", () => {
    it("should be a number", () => {
      expect(typeof CACHE_VERSION).toBe("number");
    });

    it("should be a positive integer", () => {
      expect(CACHE_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(CACHE_VERSION)).toBe(true);
    });
  });

  describe("CACHE_EXPIRATION", () => {
    it("should have all required properties", () => {
      expect(CACHE_EXPIRATION).toHaveProperty("FEED");
      expect(CACHE_EXPIRATION).toHaveProperty("PROFILE");
      expect(CACHE_EXPIRATION).toHaveProperty("INSTANCE_INFO");
      expect(CACHE_EXPIRATION).toHaveProperty("RELATIONSHIPS");
      expect(CACHE_EXPIRATION).toHaveProperty("STALE_TIME");
    });

    it("should have all values as positive numbers", () => {
      Object.values(CACHE_EXPIRATION).forEach((value) => {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThan(0);
      });
    });

    it("should have FEED expiration of 60 minutes", () => {
      expect(CACHE_EXPIRATION.FEED).toBe(60 * 60 * 1000);
    });

    it("should have RELATIONSHIPS expiration of 30 minutes", () => {
      expect(CACHE_EXPIRATION.RELATIONSHIPS).toBe(30 * 60 * 1000);
    });
  });

  describe("STORAGE_LIMITS", () => {
    it("should have all required properties", () => {
      expect(STORAGE_LIMITS).toHaveProperty("MAX_CACHED_POSTS");
      expect(STORAGE_LIMITS).toHaveProperty("MAX_CACHED_PROFILES");
      expect(STORAGE_LIMITS).toHaveProperty("MAX_CACHED_RELATIONSHIPS");
    });

    it("should have all values as positive integers", () => {
      Object.values(STORAGE_LIMITS).forEach((value) => {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThan(0);
        expect(Number.isInteger(value)).toBe(true);
      });
    });
  });

  describe("REQUEST_QUEUE_CONFIG", () => {
    it("should have all required properties", () => {
      expect(REQUEST_QUEUE_CONFIG).toHaveProperty("MAX_CONCURRENT_REQUESTS");
      expect(REQUEST_QUEUE_CONFIG).toHaveProperty("REQUEST_DELAY");
      expect(REQUEST_QUEUE_CONFIG).toHaveProperty("RATE_LIMIT_DELAY");
      expect(REQUEST_QUEUE_CONFIG).toHaveProperty("MAX_RETRIES");
      expect(REQUEST_QUEUE_CONFIG).toHaveProperty("RETRY_BACKOFF");
    });

    it("should have all values as positive numbers", () => {
      Object.values(REQUEST_QUEUE_CONFIG).forEach((value) => {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe("VIRTUAL_SCROLL_CONFIG", () => {
    it("should have all required properties", () => {
      expect(VIRTUAL_SCROLL_CONFIG).toHaveProperty("WINDOW_SIZE");
      expect(VIRTUAL_SCROLL_CONFIG).toHaveProperty("OVERSCAN");
      expect(VIRTUAL_SCROLL_CONFIG).toHaveProperty("FETCH_THRESHOLD");
      expect(VIRTUAL_SCROLL_CONFIG).toHaveProperty("INITIAL_LOAD");
    });

    it("should have all values as positive integers", () => {
      Object.values(VIRTUAL_SCROLL_CONFIG).forEach((value) => {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThan(0);
        expect(Number.isInteger(value)).toBe(true);
      });
    });
  });

  describe("RELATIONSHIP_BATCHER_CONFIG", () => {
    it("should have all required properties", () => {
      expect(RELATIONSHIP_BATCHER_CONFIG).toHaveProperty("BATCH_SIZE");
      expect(RELATIONSHIP_BATCHER_CONFIG).toHaveProperty("BATCH_DELAY");
      expect(RELATIONSHIP_BATCHER_CONFIG).toHaveProperty("MAX_BATCH_INTERVAL");
    });

    it("should have BATCH_SIZE of 40 (Mastodon API limit)", () => {
      expect(RELATIONSHIP_BATCHER_CONFIG.BATCH_SIZE).toBe(40);
    });

    it("should have all values as positive numbers", () => {
      Object.values(RELATIONSHIP_BATCHER_CONFIG).forEach((value) => {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe("REQUEST_CACHE_CONFIG", () => {
    it("should have all required properties", () => {
      expect(REQUEST_CACHE_CONFIG).toHaveProperty("CLEAR_DELAY");
      expect(REQUEST_CACHE_CONFIG).toHaveProperty("DRAIN_CHECK_INTERVAL");
    });

    it("should have all values as positive numbers", () => {
      Object.values(REQUEST_CACHE_CONFIG).forEach((value) => {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThan(0);
      });
    });

    it("should have CLEAR_DELAY of 5000ms", () => {
      expect(REQUEST_CACHE_CONFIG.CLEAR_DELAY).toBe(5000);
    });

    it("should have DRAIN_CHECK_INTERVAL of 100ms", () => {
      expect(REQUEST_CACHE_CONFIG.DRAIN_CHECK_INTERVAL).toBe(100);
    });
  });
});
