import { useState, useCallback, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { getActiveClient } from "@lib/api/client";
import { useTheme } from "@contexts/ThemeContext";
import { useAuth } from "@contexts/AuthContext";

/**
 * Follow Component
 * Toggle follow status for accounts and hashtags
 * Displays footprints emoji (👣) that changes opacity based on follow status
 */

interface FollowProps {
  accountId?: string;
  hashtagName?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function Follow({
  accountId,
  hashtagName,
  onFollowChange,
}: FollowProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const isAccountFollow = !!accountId;
  const isHashtagFollow = !!hashtagName;

  // Don't show for user's own account
  if (isAccountFollow && user && accountId === user.id) {
    return null;
  }

  // Don't render if no accountId or hashtagName is provided
  if (!accountId && !hashtagName) {
    return null;
  }

  /**
   * Fetch initial follow status
   */
  useEffect(() => {
    const fetchFollowStatus = async () => {
      try {
        setIsLoading(true);
        const activeClient = await getActiveClient();
        if (!activeClient) {
          setIsLoading(false);
          return;
        }

        if (isAccountFollow && accountId) {
          // Get account relationship
          const relationships =
            await activeClient.client.v1.accounts.relationships.fetch({
              id: [accountId],
            });
          if (relationships.length > 0) {
            setIsFollowing(relationships[0].following || false);
          }
        } else if (isHashtagFollow && hashtagName) {
          // Get hashtag follow status
          try {
            const tag = await activeClient.client.v1.tags
              .$select(hashtagName)
              .fetch();
            setIsFollowing((tag as any).following || false);
          } catch (error) {
            // Hashtag might not exist or no follow status
            setIsFollowing(false);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("[Follow] Error fetching follow status:", error);
        setIsLoading(false);
      }
    };

    fetchFollowStatus();
  }, [accountId, hashtagName, isAccountFollow, isHashtagFollow]);

  /**
   * Toggle follow status
   */
  const handleFollowToggle = useCallback(async () => {
    if (isProcessing || isLoading) return;

    try {
      setIsProcessing(true);
      const activeClient = await getActiveClient();
      if (!activeClient) {
        Alert.alert("Error", "Could not connect to Mastodon");
        setIsProcessing(false);
        return;
      }

      let newFollowStatus = !isFollowing;

      if (isAccountFollow && accountId) {
        // Toggle account follow
        if (isFollowing) {
          await activeClient.client.v1.accounts.$select(accountId).unfollow();
          newFollowStatus = false;
        } else {
          await activeClient.client.v1.accounts.$select(accountId).follow();
          newFollowStatus = true;
        }
      } else if (isHashtagFollow && hashtagName) {
        // Toggle hashtag follow
        if (isFollowing) {
          await activeClient.client.v1.tags.$select(hashtagName).unfollow();
          newFollowStatus = false;
        } else {
          await activeClient.client.v1.tags.$select(hashtagName).follow();
          newFollowStatus = true;
        }
      }

      setIsFollowing(newFollowStatus);
      onFollowChange?.(newFollowStatus);
      setIsProcessing(false);
    } catch (error) {
      console.error("[Follow] Error toggling follow status:", error);
      setIsProcessing(false);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("403") || errorMessage.includes("401")) {
        Alert.alert(
          "Authentication Error",
          "Please log out and log back in to refresh your credentials.",
        );
      } else if (errorMessage.includes("429")) {
        Alert.alert(
          "Rate Limit",
          "Too many requests. Please wait a moment before trying again.",
        );
      } else {
        const followType = isAccountFollow ? "account" : "hashtag";
        Alert.alert(
          "Follow Error",
          `Failed to ${isFollowing ? "unfollow" : "follow"} ${followType}: ${errorMessage}`,
        );
      }
    }
  }, [
    isProcessing,
    isLoading,
    isFollowing,
    accountId,
    hashtagName,
    isAccountFollow,
    isHashtagFollow,
    onFollowChange,
  ]);

  if (isLoading) {
    return <Text style={[styles.icon, styles.loadingIcon]}>👣</Text>;
  }

  return (
    <TouchableOpacity
      onPress={handleFollowToggle}
      disabled={isProcessing}
      activeOpacity={0.7}
      accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
      accessibilityRole="button"
    >
      {isProcessing ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Text style={[styles.icon, { opacity: isFollowing ? 1 : 0.4 }]}>
          👣
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 18,
  },
  loadingIcon: {
    opacity: 0.4,
  },
});
