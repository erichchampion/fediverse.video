import { useState, useEffect } from "react";
import { Alert, Share } from "react-native";
import { useRouter } from "expo-router";
import type { Post } from "@types";
import { getActiveClient } from "@lib/api/client";
import { getContentPreview } from "@lib/utils/html";

/**
 * Custom hook for managing post interactions
 * Phase 5: Interactions & Compose
 */

interface UsePostInteractionsOptions {
  post: Post;
  onUpdate?: (updatedPost: Post) => void;
  onDelete?: (postId: string) => void;
}

export function usePostInteractions({
  post,
  onUpdate,
  onDelete,
}: UsePostInteractionsOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const router = useRouter();

  // Sync localPost when post prop changes (e.g., from parent updates)
  // This ensures that when onUpdate is called and parent updates the post,
  // the localPost reflects the new state
  useEffect(() => {
    // Only update if the post ID matches and we're not currently processing
    // This prevents unnecessary updates during processing and race conditions
    if (post.id === localPost.id && !isProcessing) {
      // Check if interactive state has changed
      const hasChanged =
        post.favourited !== localPost.favourited ||
        post.reblogged !== localPost.reblogged ||
        post.bookmarked !== localPost.bookmarked ||
        post.favouritesCount !== localPost.favouritesCount ||
        post.reblogsCount !== localPost.reblogsCount ||
        post.repliesCount !== localPost.repliesCount;

      if (hasChanged) {
        setLocalPost(post);
      }
    }
    // Use post.id and interactive state fields as dependencies instead of the whole post object
    // to avoid unnecessary re-runs when other post properties change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    post.id,
    post.favourited,
    post.reblogged,
    post.bookmarked,
    post.favouritesCount,
    post.reblogsCount,
    post.repliesCount,
    localPost.id,
    isProcessing,
  ]);

  /**
   * Toggle favorite (like)
   */
  const toggleFavorite = async () => {
    if (isProcessing) return;

    const previousState = localPost.favourited;
    const previousCount = localPost.favouritesCount;

    try {
      setIsProcessing(true);

      // Optimistic update
      const optimisticPost = {
        ...localPost,
        favourited: !previousState,
        favouritesCount: previousState
          ? Math.max(0, previousCount - 1)
          : previousCount + 1,
      };
      setLocalPost(optimisticPost);
      onUpdate?.(optimisticPost);

      // API call
      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      const { client } = activeClient;
      const updatedStatus = previousState
        ? await client.v1.statuses.$select(post.id).unfavourite()
        : await client.v1.statuses.$select(post.id).favourite();

      // Update with server response
      const serverPost = {
        ...localPost,
        favourited: updatedStatus.favourited ?? false,
        favouritesCount: updatedStatus.favouritesCount ?? 0,
      };
      setLocalPost(serverPost);
      onUpdate?.(serverPost);
    } catch (error) {
      console.error("Error toggling favorite:", error);

      // Rollback on error
      const rolledBackPost = {
        ...localPost,
        favourited: previousState,
        favouritesCount: previousCount,
      };
      setLocalPost(rolledBackPost);
      onUpdate?.(rolledBackPost);

      Alert.alert("Error", "Failed to update favorite. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Toggle boost (reblog)
   */
  const toggleBoost = async () => {
    if (isProcessing) return;

    const previousState = localPost.reblogged;
    const previousCount = localPost.reblogsCount;

    try {
      setIsProcessing(true);

      // Optimistic update
      const optimisticPost = {
        ...localPost,
        reblogged: !previousState,
        reblogsCount: previousState
          ? Math.max(0, previousCount - 1)
          : previousCount + 1,
      };
      setLocalPost(optimisticPost);
      onUpdate?.(optimisticPost);

      // API call
      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      const { client } = activeClient;
      const updatedStatus = previousState
        ? await client.v1.statuses.$select(post.id).unreblog()
        : await client.v1.statuses.$select(post.id).reblog();

      // Update with server response
      const serverPost = {
        ...localPost,
        reblogged: updatedStatus.reblogged ?? false,
        reblogsCount: updatedStatus.reblogsCount ?? 0,
      };
      setLocalPost(serverPost);
      onUpdate?.(serverPost);
    } catch (error) {
      console.error("Error toggling boost:", error);

      // Rollback on error
      const rolledBackPost = {
        ...localPost,
        reblogged: previousState,
        reblogsCount: previousCount,
      };
      setLocalPost(rolledBackPost);
      onUpdate?.(rolledBackPost);

      Alert.alert("Error", "Failed to update boost. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Toggle bookmark
   */
  const toggleBookmark = async () => {
    if (isProcessing) return;

    const previousState = localPost.bookmarked;

    try {
      setIsProcessing(true);

      // Optimistic update
      const optimisticPost = {
        ...localPost,
        bookmarked: !previousState,
      };
      setLocalPost(optimisticPost);
      onUpdate?.(optimisticPost);

      // API call
      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      const { client } = activeClient;
      const updatedStatus = previousState
        ? await client.v1.statuses.$select(post.id).unbookmark()
        : await client.v1.statuses.$select(post.id).bookmark();

      // Update with server response
      const serverPost = {
        ...localPost,
        bookmarked: updatedStatus.bookmarked ?? false,
      };
      setLocalPost(serverPost);
      onUpdate?.(serverPost);
    } catch (error) {
      console.error("Error toggling bookmark:", error);

      // Rollback on error
      const rolledBackPost = {
        ...localPost,
        bookmarked: previousState,
      };
      setLocalPost(rolledBackPost);
      onUpdate?.(rolledBackPost);

      Alert.alert("Error", "Failed to update bookmark. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reply to post (navigate to compose)
   */
  const reply = () => {
    // Strip HTML tags from content for preview
    const contentPreview = getContentPreview(post.content);

    router.push({
      pathname: "/modals/compose",
      params: {
        replyToId: post.id,
        replyToUsername: post.account.acct,
        replyToContent: contentPreview,
      },
    });
  };

  /**
   * Share post
   */
  const share = async () => {
    if (!post.url) {
      Alert.alert("Error", "Post URL not available");
      return;
    }

    try {
      // Extract instance URL from post URL
      let shareMessage = post.url;
      try {
        const url = new URL(post.url);
        const instance = url.hostname;
        const username = post.account.username;
        shareMessage = `Check out this post by @${username} on ${instance}\n\n${post.url}`;
      } catch (urlError) {
        // If URL parsing fails, just use the post URL
        console.warn("Failed to parse post URL:", urlError);
      }

      await Share.share({
        message: shareMessage,
        url: post.url,
      });
    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };

  /**
   * Delete post
   */
  const deletePost = async () => {
    Alert.alert(
      "Delete Post?",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsProcessing(true);

              const activeClient = await getActiveClient();
              if (!activeClient) {
                throw new Error("No active client");
              }

              const { client } = activeClient;
              await client.v1.statuses.$select(post.id).remove();

              onDelete?.(post.id);
            } catch (error) {
              console.error("Error deleting post:", error);
              Alert.alert("Error", "Failed to delete post. Please try again.");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  return {
    post: localPost,
    isProcessing,
    toggleFavorite,
    toggleBoost,
    toggleBookmark,
    reply,
    share,
    deletePost,
  };
}
