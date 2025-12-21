import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Clipboard,
} from "react-native";
import { memo, useCallback } from "react";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useTheme } from "@contexts/ThemeContext";

/**
 * Post Menu Component
 * Three-dot menu for post actions (reply, boost, favorite, bookmark, share, delete, copy link)
 */

export interface PostMenuProps {
  postId: string;
  postUrl: string;
  accountId: string;
  username: string;
  isOwnPost: boolean;
  onDelete: () => void;
  onReply: () => void;
  onToggleBoost: () => void;
  onToggleFavorite: () => void;
  onToggleBookmark: () => void;
  onShare: () => void;
  repliesCount: number;
  reblogsCount: number;
  favouritesCount: number;
  reblogged: boolean;
  favourited: boolean;
  bookmarked: boolean;
}

export const PostMenu = memo<PostMenuProps>(function PostMenu({
  postId,
  postUrl,
  accountId,
  username,
  isOwnPost,
  onDelete,
  onReply,
  onToggleBoost,
  onToggleFavorite,
  onToggleBookmark,
  onShare,
  repliesCount,
  reblogsCount,
  favouritesCount,
  reblogged,
  favourited,
  bookmarked,
}) {
  const { colors } = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();

  const handleCopyLink = useCallback(() => {
    Clipboard.setString(postUrl);
    Alert.alert("Link Copied", "Post link copied to clipboard");
  }, [postUrl]);

  const handleMenuPress = useCallback(() => {
    const options: string[] = [];
    const destructiveIndex: number[] = [];
    const handlers: (() => void)[] = [];

    // Post interaction actions (at the top)

    // Reply
    const replyLabel = repliesCount > 0 ? `Reply (${repliesCount})` : "Reply";
    options.push(replyLabel);
    handlers.push(onReply);

    // Boost
    const boostLabel =
      reblogsCount > 0
        ? reblogged
          ? `Unboost (${reblogsCount})`
          : `Boost (${reblogsCount})`
        : reblogged
          ? "Unboost"
          : "Boost";
    options.push(boostLabel);
    handlers.push(onToggleBoost);

    // Favorite
    const favoriteLabel =
      favouritesCount > 0
        ? favourited
          ? `Unfavorite (${favouritesCount})`
          : `Favorite (${favouritesCount})`
        : favourited
          ? "Unfavorite"
          : "Favorite";
    options.push(favoriteLabel);
    handlers.push(onToggleFavorite);

    // Bookmark
    options.push(bookmarked ? "Remove Bookmark" : "Bookmark");
    handlers.push(onToggleBookmark);

    // Share
    options.push("Share");
    handlers.push(onShare);

    if (isOwnPost) {
      // Own post: show Delete option
      options.push("Delete");
      destructiveIndex.push(options.length - 1);
      handlers.push(onDelete);
    }

    // Common options - Copy Link (available for all posts)
    options.push("Copy Link");
    handlers.push(handleCopyLink);

    options.push("Cancel");
    handlers.push(() => {}); // No-op for cancel

    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex:
          destructiveIndex.length > 0 ? destructiveIndex[0] : undefined,
      },
      (buttonIndex) => {
        if (buttonIndex !== undefined && buttonIndex < handlers.length) {
          handlers[buttonIndex]();
        }
      },
    );
  }, [
    isOwnPost,
    postUrl,
    onDelete,
    handleCopyLink,
    onReply,
    onToggleBoost,
    onToggleFavorite,
    onToggleBookmark,
    onShare,
    repliesCount,
    reblogsCount,
    favouritesCount,
    reblogged,
    favourited,
    bookmarked,
  ]);

  return (
    <TouchableOpacity
      style={styles.menuButton}
      onPress={handleMenuPress}
      testID="post-menu-button"
      accessibilityLabel="More options"
      accessibilityHint="Opens menu with additional actions"
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={[styles.menuIcon, { color: colors.textSecondary }]}>⋯</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  menuButton: {
    padding: 4,
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: "600",
  },
});
