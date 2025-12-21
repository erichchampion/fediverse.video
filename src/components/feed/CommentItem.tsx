import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { memo, useCallback, useState } from "react";
import { useRouter } from "expo-router";
import type { Post } from "@types";
import { Avatar, RichText } from "@components/base";
import { MediaGrid } from "@components/media";
import { useTheme } from "@contexts/ThemeContext";
import { useAuth } from "@contexts/AuthContext";
import { usePostInteractions } from "@hooks/usePostInteractions";
import { getActiveClient } from "@lib/api/client";
import { getPlainTextContent } from "@lib/api/timeline";
import { formatDistanceToNow } from "date-fns";

/**
 * Comment Item Component
 * Displays an individual comment with user info, content, and interaction buttons
 */

interface CommentItemProps {
  comment: Post;
  onReply: (commentId: string, username: string, content: string) => void;
  onUpdate?: (updatedComment: Post) => void;
  onDelete?: (commentId: string) => void;
}

// Custom comparison function for memo
const areCommentsEqual = (
  prevProps: CommentItemProps,
  nextProps: CommentItemProps,
) => {
  return (
    prevProps.comment.id === nextProps.comment.id &&
    prevProps.comment.favourited === nextProps.comment.favourited &&
    prevProps.comment.reblogged === nextProps.comment.reblogged &&
    prevProps.comment.favouritesCount === nextProps.comment.favouritesCount &&
    prevProps.comment.reblogsCount === nextProps.comment.reblogsCount
  );
};

export const CommentItem = memo<CommentItemProps>(function CommentItem({
  comment,
  onReply,
  onUpdate,
  onDelete,
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // Defensive check
  if (!comment || !comment.id || !comment.account) {
    console.warn("[CommentItem] Invalid comment data");
    return null;
  }

  // Check if this is the user's own comment
  const isOwnComment = user?.id === comment.account.id;

  // Handle comment deletion
  const handleCommentDelete = useCallback(
    (commentId: string) => {
      console.log("[CommentItem] Comment deleted:", commentId);
      onDelete?.(commentId);
    },
    [onDelete],
  );

  // Use post interactions hook for like, boost, and delete
  const {
    post: interactiveComment,
    toggleFavorite,
    toggleBoost,
    deletePost: deleteComment,
  } = usePostInteractions({
    post: comment,
    onUpdate,
    onDelete: handleCommentDelete,
  });

  const [isLiked, setIsLiked] = useState(
    interactiveComment.favourited || false,
  );
  const [isReblogged, setIsReblogged] = useState(
    interactiveComment.reblogged || false,
  );
  const [likeCount, setLikeCount] = useState(
    interactiveComment.favouritesCount || 0,
  );
  const [boostCount, setBoostCount] = useState(
    interactiveComment.reblogsCount || 0,
  );

  const handleProfilePress = useCallback(() => {
    router.push(`/(modals)/user-profile?accountId=${comment.account.id}`);
  }, [router, comment.account.id]);

  const handleReply = useCallback(() => {
    // Strip HTML from content for preview
    const plainContent = getPlainTextContent(comment);
    onReply(comment.id, comment.account.username, plainContent);
  }, [comment, onReply]);

  const handleToggleLike = useCallback(() => {
    toggleFavorite();
    // Update local state for immediate feedback
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? Math.max(0, prev - 1) : prev + 1));
  }, [toggleFavorite, isLiked]);

  const handleToggleBoost = useCallback(() => {
    toggleBoost();
    // Update local state for immediate feedback
    setIsReblogged((prev) => !prev);
    setBoostCount((prev) => (isReblogged ? Math.max(0, prev - 1) : prev + 1));
  }, [toggleBoost, isReblogged]);

  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
  });

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {/* Header with avatar and user info */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleProfilePress}
          style={styles.avatarContainer}
        >
          <Avatar uri={comment.account.avatar} size={32} />
        </TouchableOpacity>

        <View style={styles.userInfo}>
          <TouchableOpacity onPress={handleProfilePress}>
            <Text
              style={[styles.displayName, { color: colors.text }]}
              numberOfLines={1}
            >
              {comment.account.displayName || comment.account.username}
            </Text>
          </TouchableOpacity>
          <View style={styles.metaRow}>
            <Text
              style={[styles.metaText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              @{comment.account.username}
              {"  ·  "}
              {timeAgo}
            </Text>
          </View>
        </View>
      </View>

      {/* Comment content */}
      <View style={styles.content}>
        <RichText post={comment} content={getPlainTextContent(comment)} />

        {/* Media attachments */}
        {comment.mediaAttachments && comment.mediaAttachments.length > 0 && (
          <View style={styles.mediaContainer}>
            <MediaGrid
              media={comment.mediaAttachments}
              sensitive={comment.sensitive}
              mode="list"
            />
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Reply button */}
        <TouchableOpacity
          onPress={handleReply}
          style={styles.actionButton}
          disabled={isProcessing}
        >
          <Text style={styles.actionIcon}>✏️</Text>
        </TouchableOpacity>

        {/* Boost button */}
        <TouchableOpacity
          onPress={handleToggleBoost}
          style={styles.actionButton}
          disabled={isProcessing}
        >
          <Text style={[styles.actionIcon, isReblogged && styles.actionActive]}>
            🔁
          </Text>
          {boostCount > 0 && (
            <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
              {boostCount}
            </Text>
          )}
        </TouchableOpacity>

        {/* Like button */}
        <TouchableOpacity
          onPress={handleToggleLike}
          style={styles.actionButton}
          disabled={isProcessing}
        >
          <Text style={styles.actionIcon}>{isLiked ? "❤️" : "🤍"}</Text>
          {likeCount > 0 && (
            <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
              {likeCount}
            </Text>
          )}
        </TouchableOpacity>

        {/* Delete button (only for own comments) */}
        {isOwnComment && (
          <TouchableOpacity
            onPress={deleteComment}
            style={styles.actionButton}
            disabled={isProcessing}
          >
            <Text
              style={[styles.actionIcon, { color: colors.error || "#FF3B30" }]}
            >
              🗑️
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}, areCommentsEqual);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  avatarContainer: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  displayName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 13,
    maxWidth: 220,
  },
  content: {
    marginBottom: 8,
    paddingLeft: 44, // Align with text above (avatar width + margin)
  },
  mediaContainer: {
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 44,
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionActive: {
    opacity: 1,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: "500",
  },
});
