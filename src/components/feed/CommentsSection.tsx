import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useState, useCallback, memo, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useTheme } from "@contexts/ThemeContext";
import { useComments } from "@hooks/useComments";
import { CommentItem } from "./CommentItem";
import type { Post } from "@types";

/**
 * CommentsSection Component
 * Displays a collapsible section for post comments
 */

interface CommentsSectionProps {
  postId: string;
  repliesCount: number;
  onCommentCountUpdate?: (count: number) => void;
}

export const CommentsSection = memo<CommentsSectionProps>(
  function CommentsSection({ postId, repliesCount, onCommentCountUpdate }) {
    const router = useRouter();
    const { colors } = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    const hasFetchedRef = useRef(false);

    // Use the comments hook with lazy loading (autoFetch = false)
    // This prevents fetching comments until the user expands the section
    const { comments, isLoading, error, refreshComments, removeComment } =
      useComments({
        postId,
        onCommentCountUpdate,
        autoFetch: false, // Don't fetch on mount - wait for user to expand
      });

    // Fetch comments when section is expanded for the first time
    useEffect(() => {
      if (isExpanded && !hasFetchedRef.current) {
        hasFetchedRef.current = true;
        refreshComments();
      }
    }, [isExpanded, refreshComments]);

    // Toggle expand/collapse
    const handleToggleExpand = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    // Navigate to compose modal to reply to main post
    const handleReplyToPost = useCallback(() => {
      const replyParams = new URLSearchParams({
        replyToId: postId,
      });
      router.push(`/modals/compose?${replyParams.toString()}`);
    }, [router, postId]);

    // Navigate to compose modal to reply to a specific comment
    const handleReplyToComment = useCallback(
      (commentId: string, username: string, content: string) => {
        const replyParams = new URLSearchParams({
          replyToId: commentId,
          replyToUsername: username,
          replyToContent: content, // Already plain text from CommentItem
        });
        router.push(`/modals/compose?${replyParams.toString()}`);
      },
      [router],
    );

    // Handle comment deletion
    const handleCommentDelete = useCallback(
      (commentId: string) => {
        console.log("[CommentsSection] Removing deleted comment:", commentId);
        removeComment(commentId);
      },
      [removeComment],
    );

    // Render individual comment
    const renderComment = useCallback(
      ({ item }: { item: Post }) => (
        <CommentItem
          comment={item}
          onReply={handleReplyToComment}
          onDelete={handleCommentDelete}
        />
      ),
      [handleReplyToComment, handleCommentDelete],
    );

    // Key extractor for FlatList
    const keyExtractor = useCallback((item: Post) => item.id, []);

    return (
      <View style={[styles.container, { borderTopColor: colors.border }]}>
        {/* Header - always visible */}
        <TouchableOpacity
          style={[styles.header, { backgroundColor: colors.card }]}
          onPress={handleToggleExpand}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={handleReplyToPost}
              style={styles.replyButton}
            >
              <Text style={styles.pencilEmoji}>✏️</Text>
            </TouchableOpacity>
            <Text style={[styles.headerText, { color: colors.text }]}>
              Replies ({repliesCount})
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>
            {isExpanded ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>

        {/* Expanded content */}
        {isExpanded && (
          <View style={styles.content}>
            {isLoading && (
              <View style={styles.stateContainer}>
                <Text
                  style={[styles.stateText, { color: colors.textSecondary }]}
                >
                  Loading comments...
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.stateContainer}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </Text>
              </View>
            )}

            {!isLoading && !error && comments.length === 0 && (
              <View style={styles.stateContainer}>
                <Text
                  style={[styles.stateText, { color: colors.textSecondary }]}
                >
                  No replies yet
                </Text>
              </View>
            )}

            {!isLoading && !error && comments.length > 0 && (
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={keyExtractor}
                scrollEnabled={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                initialNumToRender={5}
              />
            )}
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  replyButton: {
    padding: 4,
  },
  pencilEmoji: {
    fontSize: 18,
  },
  headerText: {
    fontSize: 15,
    fontWeight: "600",
  },
  chevron: {
    fontSize: 12,
  },
  content: {
    backgroundColor: "transparent",
  },
  stateContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  stateText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
  },
});
