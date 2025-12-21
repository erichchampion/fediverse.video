import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { memo, useCallback } from "react";
import type { Account } from "@types";
import { Avatar } from "@components/base";
import { useTheme } from "@contexts/ThemeContext";
import { formatTimestamp } from "@lib/api/timeline";
import { PostMenu } from "./PostMenu";

/**
 * Post Header Component
 * Displays post author info, timestamp, boost indicator, and menu
 */

export interface PostHeaderProps {
  account: Account;
  createdAt: string;
  boostedBy?: Account;
  onAccountClick?: (accountId: string) => void;
  // Menu props
  postId?: string;
  postUrl?: string;
  isOwnPost?: boolean;
  onDeletePost?: () => void;
  onReply?: () => void;
  onToggleBoost?: () => void;
  onToggleFavorite?: () => void;
  onToggleBookmark?: () => void;
  onShare?: () => void;
  repliesCount?: number;
  reblogsCount?: number;
  favouritesCount?: number;
  reblogged?: boolean;
  favourited?: boolean;
  bookmarked?: boolean;
  // Relationship status
  isFollowing?: boolean;
}

// Comparison function for PostHeader memoization
const arePostHeaderPropsEqual = (
  prevProps: PostHeaderProps,
  nextProps: PostHeaderProps,
) => {
  // Only re-render if account, timestamp, counts, or interactive state has changed
  return (
    prevProps.account.id === nextProps.account.id &&
    prevProps.account.displayName === nextProps.account.displayName &&
    prevProps.account.username === nextProps.account.username &&
    prevProps.account.avatar === nextProps.account.avatar &&
    prevProps.createdAt === nextProps.createdAt &&
    prevProps.boostedBy?.id === nextProps.boostedBy?.id &&
    prevProps.postId === nextProps.postId &&
    prevProps.postUrl === nextProps.postUrl &&
    prevProps.isOwnPost === nextProps.isOwnPost &&
    prevProps.repliesCount === nextProps.repliesCount &&
    prevProps.reblogsCount === nextProps.reblogsCount &&
    prevProps.favouritesCount === nextProps.favouritesCount &&
    prevProps.reblogged === nextProps.reblogged &&
    prevProps.favourited === nextProps.favourited &&
    prevProps.bookmarked === nextProps.bookmarked &&
    prevProps.isFollowing === nextProps.isFollowing &&
    prevProps.onAccountClick === nextProps.onAccountClick &&
    prevProps.onDeletePost === nextProps.onDeletePost &&
    prevProps.onReply === nextProps.onReply &&
    prevProps.onToggleBoost === nextProps.onToggleBoost &&
    prevProps.onToggleFavorite === nextProps.onToggleFavorite &&
    prevProps.onToggleBookmark === nextProps.onToggleBookmark &&
    prevProps.onShare === nextProps.onShare
  );
};

export const PostHeader = memo<PostHeaderProps>(function PostHeader({
  account,
  createdAt,
  boostedBy,
  onAccountClick,
  postId,
  postUrl,
  isOwnPost,
  onDeletePost,
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
  isFollowing,
}) {
  const { colors } = useTheme();

  const handleAccountPress = useCallback(() => {
    if (onAccountClick) {
      onAccountClick(account.id);
    }
  }, [onAccountClick, account.id]);

  const handleBoosterPress = useCallback(() => {
    if (onAccountClick && boostedBy) {
      onAccountClick(boostedBy.id);
    }
  }, [onAccountClick, boostedBy]);

  const displayName = account.displayName?.trim() || account.username;
  const boosterDisplayName =
    boostedBy?.displayName?.trim() || boostedBy?.username;

  // Only show menu if we have the required props
  const showMenu =
    postId && postUrl && onDeletePost !== undefined && onReply !== undefined;

  return (
    <View>
      {/* Boost indicator */}
      {boostedBy && (
        <View style={styles.boostHeader}>
          <Text style={[styles.boostIcon, { color: colors.textSecondary }]}>
            🔁
          </Text>
          <TouchableOpacity
            onPress={handleBoosterPress}
            activeOpacity={0.7}
            disabled={!onAccountClick}
          >
            <Text style={[styles.boostText, { color: colors.textSecondary }]}>
              {boosterDisplayName} boosted
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleAccountPress}
          activeOpacity={0.7}
          disabled={!onAccountClick}
        >
          <Avatar
            uri={account.avatar}
            size={32}
            badge={isFollowing ? "👣" : undefined}
          />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <TouchableOpacity
            onPress={handleAccountPress}
            activeOpacity={0.7}
            disabled={!onAccountClick}
          >
            <Text
              style={[styles.displayName, { color: colors.text }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </TouchableOpacity>
          <View style={styles.metaRow}>
            <Text
              style={[styles.metaText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              @{account.username}
              {"  ·  "}
              {formatTimestamp(createdAt)}
            </Text>
          </View>
        </View>

        {/* Interaction status indicators */}
        <View style={styles.indicators}>
          {favourited && <Text style={styles.indicator}>❤️</Text>}
          {bookmarked && <Text style={styles.indicator}>🔖</Text>}
        </View>

        {/* Menu button */}
        {showMenu && (
          <PostMenu
            postId={postId!}
            postUrl={postUrl!}
            accountId={account.id}
            username={account.username}
            isOwnPost={isOwnPost ?? false}
            onDelete={onDeletePost!}
            onReply={onReply!}
            onToggleBoost={onToggleBoost!}
            onToggleFavorite={onToggleFavorite!}
            onToggleBookmark={onToggleBookmark!}
            onShare={onShare!}
            repliesCount={repliesCount ?? 0}
            reblogsCount={reblogsCount ?? 0}
            favouritesCount={favouritesCount ?? 0}
            reblogged={reblogged ?? false}
            favourited={favourited ?? false}
            bookmarked={bookmarked ?? false}
          />
        )}
      </View>
    </View>
  );
}, arePostHeaderPropsEqual);

const styles = StyleSheet.create({
  boostHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  boostIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  boostText: {
    fontSize: 13,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: "center",
  },
  displayName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 14,
    maxWidth: 220,
  },
  indicators: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 4,
  },
  indicator: {
    fontSize: 14,
  },
});
