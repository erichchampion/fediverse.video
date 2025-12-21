import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type {
  TimelineOption,
  ListTimeline,
  TrendingHashtag,
} from "@shared/types";
import { getActiveClient } from "@lib/api/client";
import { storageService } from "@lib/storage";
import { useAuth } from "./AuthContext";
import { API_LIMITS } from "@/config";

/**
 * Timelines Context
 * Manages timeline options and dynamically added feeds
 * Matches web app's Timelines component functionality
 */

interface TimelinesContextType {
  timelineOptions: TimelineOption[];
  isLoading: boolean;
  error: string | null;
  addHashtagFeed: (hashtag: string) => void;
  addAccountFeed: (accountId: string, displayName: string) => void;
  removeFeed: (feedId: string) => void;
  refreshTimelines: () => Promise<void>;
}

const TimelinesContext = createContext<TimelinesContextType | undefined>(
  undefined,
);

// Base timeline options (always present)
export const BASE_TIMELINE_OPTIONS: TimelineOption[] = [
  {
    id: "home",
    name: "Home Feed",
    type: "home",
    description: "Your home timeline",
  },
  {
    id: "public",
    name: "Public Feed",
    type: "public",
    description: "Public timeline",
  },
  {
    id: "local",
    name: "Local Feed",
    type: "local",
    description: "Local timeline for your instance",
  },
  {
    id: "favourites",
    name: "Favourites",
    type: "favourites",
    description: "Your favourited posts",
  },
  {
    id: "bookmarks",
    name: "Bookmarks",
    type: "bookmarks",
    description: "Your bookmarked posts",
  },
];

const STORAGE_KEY = "dynamic_timelines";

export function TimelinesProvider({ children }: { children: React.ReactNode }) {
  const { instance } = useAuth();
  const [timelineOptions, setTimelineOptions] = useState<TimelineOption[]>(
    BASE_TIMELINE_OPTIONS,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track dynamically added feeds
  const dynamicHashtagsRef = useRef<Set<string>>(new Set());
  const dynamicAccountsRef = useRef<Map<string, string>>(new Map()); // accountId -> displayName

  /**
   * Load dynamic timelines from storage
   */
  const loadDynamicTimelines = useCallback(async () => {
    if (!instance) return;

    try {
      const data = await storageService.getPreference(instance.id, STORAGE_KEY);
      if (data) {
        // Restore hashtags
        if (data.hashtags && Array.isArray(data.hashtags)) {
          data.hashtags.forEach((hashtag: string) =>
            dynamicHashtagsRef.current.add(hashtag),
          );
        }

        // Restore accounts
        if (data.accounts && Array.isArray(data.accounts)) {
          data.accounts.forEach(
            (account: { id: string; displayName: string }) => {
              dynamicAccountsRef.current.set(account.id, account.displayName);
            },
          );
        }
      }
    } catch (error) {
      console.error(
        "[TimelinesContext] Error loading dynamic timelines:",
        error,
      );
    }
  }, [instance]);

  /**
   * Save dynamic timelines to storage
   */
  const saveDynamicTimelines = useCallback(async () => {
    if (!instance) return;

    try {
      const data = {
        hashtags: Array.from(dynamicHashtagsRef.current),
        accounts: Array.from(dynamicAccountsRef.current.entries()).map(
          ([id, displayName]) => ({
            id,
            displayName,
          }),
        ),
      };

      await storageService.setPreference(instance.id, STORAGE_KEY, data);
    } catch (error) {
      console.error(
        "[TimelinesContext] Error saving dynamic timelines:",
        error,
      );
    }
  }, [instance]);

  /**
   * Fetch available timelines from API
   */
  const fetchAvailableTimelines = useCallback(async () => {
    const activeClient = await getActiveClient();
    if (!activeClient) {
      setTimelineOptions(BASE_TIMELINE_OPTIONS);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const availableOptions = [...BASE_TIMELINE_OPTIONS];

      // Fetch lists and trending hashtags in parallel
      const [userListsResult, trendingTagsResult] = await Promise.allSettled([
        (async () => {
          const paginator = activeClient.client.v1.lists.list();
          const results: ListTimeline[] = [];
          for await (const page of paginator) {
            results.push(...(page as any));
            break; // Only first page
          }
          return results;
        })(),
        (async () => {
          const paginator = activeClient.client.v1.trends.tags.list({
            limit: API_LIMITS.TRENDING_HASHTAGS,
          });
          const results: TrendingHashtag[] = [];
          for await (const page of paginator) {
            results.push(...(page as any));
            if (results.length >= API_LIMITS.TRENDING_HASHTAGS) break;
          }
          return results.slice(0, API_LIMITS.TRENDING_HASHTAGS);
        })(),
      ]);

      // Process user lists
      if (userListsResult.status === "fulfilled" && userListsResult.value) {
        const listOptions: TimelineOption[] = userListsResult.value.map(
          (list: ListTimeline) => ({
            id: `list:${list.id}`,
            name: list.title,
            type: "list" as const,
            description: `List: ${list.title}`,
          }),
        );
        availableOptions.push(...listOptions);
      }

      // Process trending hashtags
      if (
        trendingTagsResult.status === "fulfilled" &&
        trendingTagsResult.value
      ) {
        const hashtagOptions: TimelineOption[] = trendingTagsResult.value.map(
          (tag: TrendingHashtag) => ({
            id: `hashtag:${tag.name}`,
            name: `#${tag.name}`,
            type: "hashtag" as const,
            description: "Trending hashtag",
          }),
        );
        availableOptions.push(...hashtagOptions);
      }

      // Add dynamic hashtags
      dynamicHashtagsRef.current.forEach((hashtag) => {
        const hashtagId = `hashtag:${hashtag}`;
        if (!availableOptions.some((option) => option.id === hashtagId)) {
          availableOptions.push({
            id: hashtagId,
            name: `#${hashtag}`,
            type: "hashtag",
            description: "Custom hashtag feed",
          });
        }
      });

      // Add dynamic accounts
      dynamicAccountsRef.current.forEach((displayName, accountId) => {
        const accountId_ = `account:${accountId}`;
        if (!availableOptions.some((option) => option.id === accountId_)) {
          availableOptions.push({
            id: accountId_,
            name: displayName,
            type: "account",
            description: `Account: ${displayName}`,
          });
        }
      });

      setTimelineOptions(availableOptions);
      setIsLoading(false);
    } catch (error) {
      console.error("[TimelinesContext] Error fetching timelines:", error);
      setError("Failed to load timelines");
      setIsLoading(false);
    }
  }, []);

  /**
   * Add hashtag feed
   */
  const addHashtagFeed = useCallback(
    (hashtag: string) => {
      console.log("[TimelinesContext] Adding hashtag feed:", hashtag);

      // Add to dynamic hashtags set
      dynamicHashtagsRef.current.add(hashtag);

      // Create new timeline option
      const hashtagId = `hashtag:${hashtag}`;
      const newOption: TimelineOption = {
        id: hashtagId,
        name: `#${hashtag}`,
        type: "hashtag",
        description: "Custom hashtag feed",
      };

      // Add to timeline options if not already present
      setTimelineOptions((prev) => {
        if (!prev.some((option) => option.id === hashtagId)) {
          return [...prev, newOption];
        }
        return prev;
      });

      // Save to storage
      saveDynamicTimelines();
    },
    [saveDynamicTimelines],
  );

  /**
   * Add account feed
   */
  const addAccountFeed = useCallback(
    (accountId: string, displayName: string) => {
      console.log(
        "[TimelinesContext] Adding account feed:",
        accountId,
        displayName,
      );

      // Add to dynamic accounts map
      dynamicAccountsRef.current.set(accountId, displayName);

      // Create new timeline option
      const accountId_ = `account:${accountId}`;
      const newOption: TimelineOption = {
        id: accountId_,
        name: displayName,
        type: "account",
        description: `Account: ${displayName}`,
      };

      // Add to timeline options if not already present
      setTimelineOptions((prev) => {
        if (!prev.some((option) => option.id === accountId_)) {
          return [...prev, newOption];
        }
        return prev;
      });

      // Save to storage
      saveDynamicTimelines();
    },
    [saveDynamicTimelines],
  );

  /**
   * Remove feed (only for dynamic feeds)
   */
  const removeFeed = useCallback(
    (feedId: string) => {
      console.log("[TimelinesContext] Removing feed:", feedId);

      if (feedId.startsWith("hashtag:")) {
        const hashtag = feedId.replace("hashtag:", "");
        dynamicHashtagsRef.current.delete(hashtag);
      } else if (feedId.startsWith("account:")) {
        const accountId = feedId.replace("account:", "");
        dynamicAccountsRef.current.delete(accountId);
      }

      // Remove from timeline options
      setTimelineOptions((prev) =>
        prev.filter((option) => option.id !== feedId),
      );

      // Save to storage
      saveDynamicTimelines();
    },
    [saveDynamicTimelines],
  );

  /**
   * Refresh timelines
   */
  const refreshTimelines = useCallback(async () => {
    await fetchAvailableTimelines();
  }, [fetchAvailableTimelines]);

  // Load dynamic timelines on mount
  useEffect(() => {
    if (instance) {
      loadDynamicTimelines().then(() => {
        fetchAvailableTimelines();
      });
    }
  }, [instance?.id, loadDynamicTimelines, fetchAvailableTimelines]);

  const value: TimelinesContextType = {
    timelineOptions,
    isLoading,
    error,
    addHashtagFeed,
    addAccountFeed,
    removeFeed,
    refreshTimelines,
  };

  return (
    <TimelinesContext.Provider value={value}>
      {children}
    </TimelinesContext.Provider>
  );
}

export function useTimelines() {
  const context = useContext(TimelinesContext);
  if (context === undefined) {
    throw new Error("useTimelines must be used within a TimelinesProvider");
  }
  return context;
}
