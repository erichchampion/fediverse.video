import { useState, useEffect, useCallback, useRef } from "react";
import { VIRTUAL_SCROLL_CONFIG } from "@lib/storage/constants";
import type { Post } from "@types";

/**
 * Virtual Scrolling Hook
 * Implements windowing to render only visible posts
 * Reduces memory usage and improves performance for large feeds
 * Phase: Performance Optimization
 */

interface VirtualScrollingOptions {
  windowSize?: number;
  overscan?: number;
  fetchThreshold?: number;
  onFetchMore?: (direction: "up" | "down") => Promise<void>;
}

interface VirtualScrollingState {
  visiblePosts: Post[];
  visibleRange: { start: number; end: number };
  totalPosts: number;
  shouldFetchMore: boolean;
}

export function useVirtualScrolling(
  allPosts: Post[],
  options: VirtualScrollingOptions = {},
) {
  const {
    windowSize = VIRTUAL_SCROLL_CONFIG.WINDOW_SIZE,
    overscan = VIRTUAL_SCROLL_CONFIG.OVERSCAN,
    fetchThreshold = VIRTUAL_SCROLL_CONFIG.FETCH_THRESHOLD,
    onFetchMore,
  } = options;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isFetchingRef = useRef(false);

  // Calculate visible range
  const visibleRange = {
    start: Math.max(0, currentIndex - overscan),
    end: Math.min(allPosts.length, currentIndex + windowSize + overscan),
  };

  // Get visible posts
  const visiblePosts = allPosts.slice(visibleRange.start, visibleRange.end);

  // Check if we need to fetch more posts
  const shouldFetchMore = useCallback((): { up: boolean; down: boolean } => {
    const distanceFromTop = currentIndex;
    const distanceFromBottom = allPosts.length - (currentIndex + windowSize);

    return {
      up: distanceFromTop < fetchThreshold,
      down: distanceFromBottom < fetchThreshold,
    };
  }, [currentIndex, allPosts.length, windowSize, fetchThreshold]);

  /**
   * Handle scroll to new index
   */
  const scrollToIndex = useCallback(
    (index: number) => {
      const newIndex = Math.max(
        0,
        Math.min(index, allPosts.length - windowSize),
      );
      setCurrentIndex(newIndex);
    },
    [allPosts.length, windowSize],
  );

  /**
   * Scroll by offset
   */
  const scrollBy = useCallback(
    (offset: number) => {
      scrollToIndex(currentIndex + offset);
    },
    [currentIndex, scrollToIndex],
  );

  /**
   * Fetch more posts when approaching edges
   */
  useEffect(() => {
    if (!onFetchMore || isFetchingRef.current) return;

    const { up, down } = shouldFetchMore();

    const fetchIfNeeded = async () => {
      if (down && !isFetchingRef.current) {
        isFetchingRef.current = true;
        setIsLoadingMore(true);
        try {
          await onFetchMore("down");
        } catch (error) {
          console.error("[VirtualScrolling] Error fetching more posts:", error);
        } finally {
          isFetchingRef.current = false;
          setIsLoadingMore(false);
        }
      }
    };

    fetchIfNeeded();
  }, [
    currentIndex,
    allPosts.length,
    windowSize,
    fetchThreshold,
    onFetchMore,
    shouldFetchMore,
  ]);

  /**
   * Reset to top
   */
  const scrollToTop = useCallback(() => {
    scrollToIndex(0);
  }, [scrollToIndex]);

  /**
   * Scroll to bottom
   */
  const scrollToBottom = useCallback(() => {
    scrollToIndex(Math.max(0, allPosts.length - windowSize));
  }, [scrollToIndex, allPosts.length, windowSize]);

  /**
   * Find and scroll to specific post
   */
  const scrollToPost = useCallback(
    (postId: string) => {
      const index = allPosts.findIndex((p) => p && p.id === postId);
      if (index !== -1) {
        scrollToIndex(index);
        return true;
      }
      return false;
    },
    [allPosts, scrollToIndex],
  );

  return {
    // Visible data
    visiblePosts,
    visibleRange,
    totalPosts: allPosts.length,

    // Current position
    currentIndex,
    isAtTop: currentIndex === 0,
    isAtBottom: currentIndex >= allPosts.length - windowSize,

    // Loading state
    isLoadingMore,

    // Scroll controls
    scrollToIndex,
    scrollBy,
    scrollToTop,
    scrollToBottom,
    scrollToPost,

    // Stats
    stats: {
      totalPosts: allPosts.length,
      visiblePosts: visiblePosts.length,
      windowStart: visibleRange.start,
      windowEnd: visibleRange.end,
      memoryUsage: `${visiblePosts.length}/${allPosts.length}`,
    },
  };
}

/**
 * Hook for managing windowed feed data
 * Combines virtual scrolling with post caching
 */
export function useWindowedFeed(
  allPosts: Post[],
  options: VirtualScrollingOptions & {
    onLoadMore?: () => Promise<void>;
    onRefresh?: () => Promise<void>;
  } = {},
) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const virtualScroll = useVirtualScrolling(allPosts, {
    windowSize: options.windowSize,
    overscan: options.overscan,
    fetchThreshold: options.fetchThreshold,
    onFetchMore: async (direction) => {
      if (direction === "down" && options.onLoadMore) {
        await options.onLoadMore();
      }
    },
  });

  /**
   * Refresh feed (pull to refresh)
   */
  const refresh = useCallback(async () => {
    if (isRefreshing || !options.onRefresh) return;

    setIsRefreshing(true);
    try {
      await options.onRefresh();
      virtualScroll.scrollToTop();
    } catch (error) {
      console.error("[WindowedFeed] Error refreshing:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, options.onRefresh, virtualScroll]);

  return {
    ...virtualScroll,
    isRefreshing,
    refresh,
  };
}

/**
 * Hook for managing post filtering with virtual scrolling
 * Allows filtering posts without losing scroll position
 */
export function useFilteredVirtualFeed(
  allPosts: Post[],
  filterFn: (post: Post) => boolean,
  options: VirtualScrollingOptions = {},
) {
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);

  // Update filtered posts when posts or filter changes
  useEffect(() => {
    // Filter out undefined posts before applying custom filter
    setFilteredPosts(
      allPosts.filter((post) => post && post.id).filter(filterFn),
    );
  }, [allPosts, filterFn]);

  return useVirtualScrolling(filteredPosts, options);
}
