import { View, Text, StyleSheet } from "react-native";
import { memo } from "react";
import type { Post } from "@types";
import { AnimatedTouchableScale } from "@components/base";
import { useTheme } from "@contexts/ThemeContext";

/**
 * Post Actions Component
 * Displays interaction buttons for a post (reply, boost, favorite, bookmark, share)
 */

export interface PostActionsProps {
  post: Post;
  isProcessing: boolean;
  onToggleFavorite: () => void;
  onToggleBoost: () => void;
  onToggleBookmark: () => void;
  onReply: () => void;
  onShare: () => void;
}

export const PostActions = memo<PostActionsProps>(function PostActions({
  post,
  isProcessing,
  onToggleFavorite,
  onToggleBoost,
  onToggleBookmark,
  onReply,
  onShare,
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Reply button */}
      <AnimatedTouchableScale
        style={styles.action}
        onPress={onReply}
        disabled={isProcessing}
        activeOpacity={1}
        scaleValue={0.9}
        testID="action-reply"
        accessibilityLabel={`Reply. ${post.repliesCount} replies`}
        accessibilityHint="Opens compose screen to reply to this post"
        accessibilityRole="button"
      >
        <Text style={[styles.actionIcon, { color: colors.textSecondary }]}>
          💬
        </Text>
        <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
          {post.repliesCount > 0 ? post.repliesCount : ""}
        </Text>
      </AnimatedTouchableScale>

      {/* Boost button */}
      <AnimatedTouchableScale
        style={styles.action}
        onPress={onToggleBoost}
        disabled={isProcessing}
        activeOpacity={1}
        scaleValue={0.9}
        testID="action-boost"
        accessibilityLabel={`Boost. ${post.reblogsCount} boosts. ${post.reblogged ? "Boosted" : "Not boosted"}`}
        accessibilityHint={
          post.reblogged
            ? "Double tap to unboost"
            : "Double tap to boost this post"
        }
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.actionIcon,
            { color: post.reblogged ? colors.success : colors.textSecondary },
          ]}
        >
          🔁
        </Text>
        <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
          {post.reblogsCount > 0 ? post.reblogsCount : ""}
        </Text>
      </AnimatedTouchableScale>

      {/* Favorite button */}
      <AnimatedTouchableScale
        style={styles.action}
        onPress={onToggleFavorite}
        disabled={isProcessing}
        activeOpacity={1}
        scaleValue={0.9}
        testID="action-favorite"
        accessibilityLabel={`Favorite. ${post.favouritesCount} favorites. ${post.favourited ? "Favorited" : "Not favorited"}`}
        accessibilityHint={
          post.favourited
            ? "Double tap to unfavorite"
            : "Double tap to favorite this post"
        }
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.actionIcon,
            { color: post.favourited ? colors.error : colors.textSecondary },
          ]}
        >
          ⭐
        </Text>
        <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
          {post.favouritesCount > 0 ? post.favouritesCount : ""}
        </Text>
      </AnimatedTouchableScale>

      {/* Bookmark button */}
      <AnimatedTouchableScale
        style={styles.action}
        onPress={onToggleBookmark}
        disabled={isProcessing}
        activeOpacity={1}
        scaleValue={0.9}
        testID="action-bookmark"
        accessibilityLabel={`Bookmark. ${post.bookmarked ? "Bookmarked" : "Not bookmarked"}`}
        accessibilityHint={
          post.bookmarked
            ? "Double tap to remove bookmark"
            : "Double tap to bookmark this post"
        }
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.actionIcon,
            { color: post.bookmarked ? colors.primary : colors.textSecondary },
          ]}
        >
          🔖
        </Text>
      </AnimatedTouchableScale>

      {/* Share button */}
      <AnimatedTouchableScale
        style={styles.action}
        onPress={onShare}
        activeOpacity={1}
        scaleValue={0.9}
        testID="action-share"
        accessibilityLabel="Share"
        accessibilityHint="Opens share menu to share this post"
        accessibilityRole="button"
      >
        <Text style={[styles.actionIcon, { color: colors.textSecondary }]}>
          ↗️
        </Text>
      </AnimatedTouchableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionCount: {
    fontSize: 13,
    minWidth: 20,
  },
});
