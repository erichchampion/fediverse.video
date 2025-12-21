import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ActionSheetIOS,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@contexts/ThemeContext";
import { getActiveClient } from "@lib/api/client";
import { useTimelines } from "@contexts/TimelinesContext";
import { useUserActions } from "@hooks/useUserActions";
import { Follow } from "@components/base";
import type { User } from "@types";
import { stripHtml } from "@lib/utils/html";
import { ERROR_MESSAGES } from "@lib/constants";

/**
 * User Profile Modal
 * Displays user information and allows following/viewing their feed
 */
export default function UserProfileScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addAccountFeed } = useTimelines();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isMuting, setIsMuting] = useState(false);
  const [relationshipLoading, setRelationshipLoading] = useState(true);

  // User actions hook for block/unblock/mute/report functionality
  const { blockUser, unblockUser, muteUser, unmuteUser, reportUser } =
    useUserActions({
      accountId: accountId || "",
      username: user?.username || "",
      onBlock: fetchRelationship,
      onMute: fetchRelationship,
    });

  // Fetch relationship status (following, blocking, etc.)
  async function fetchRelationship() {
    if (!accountId) return;

    try {
      setRelationshipLoading(true);
      const activeClient = await getActiveClient();
      if (!activeClient) return;

      const relationships =
        await activeClient.client.v1.accounts.relationships.fetch({
          id: [accountId],
        });

      if (relationships.length > 0) {
        setIsFollowing(relationships[0].following || false);
        setIsBlocking(relationships[0].blocking || false);
        setIsMuting(relationships[0].muting || false);
      }
    } catch (error) {
      console.error("[UserProfile] Error fetching relationship:", error);
    } finally {
      setRelationshipLoading(false);
    }
  }

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!accountId) {
        setError("No account ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const activeClient = await getActiveClient();
        if (!activeClient) {
          throw new Error("No active client");
        }

        const account = await activeClient.client.v1.accounts
          .$select(accountId)
          .fetch();

        // Transform to User type
        const transformedUser: User = {
          id: account.id,
          username: account.username,
          displayName: account.displayName || account.username,
          avatar: account.avatar,
          header: account.header || "",
          followersCount: account.followersCount || 0,
          followingCount: account.followingCount || 0,
          statusesCount: account.statusesCount || 0,
          note: account.note || "",
          url: account.url || "",
          acct: account.acct,
          locked: account.locked || false,
          bot: account.bot || false,
          createdAt: account.createdAt,
          fields: account.fields || [],
          emojis: account.emojis || [],
        };

        setUser(transformedUser);
        setError(null);
      } catch (err) {
        console.error("[UserProfile] Error fetching user:", err);
        setError("Failed to load user profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [accountId]);

  // Fetch relationship status when account is loaded
  useEffect(() => {
    if (accountId && user) {
      fetchRelationship();
    }
  }, [accountId, user?.id]);

  const handleViewFeed = () => {
    if (!user) return;

    // Add account feed and navigate to it
    addAccountFeed(user.id, user.displayName);
    router.back();
    router.push(`/(tabs)/feed/account/${user.id}` as any);
  };

  const handleClose = () => {
    router.back();
  };

  const handleFollowToggle = useCallback(async () => {
    if (!accountId) return;

    try {
      const activeClient = await getActiveClient();
      if (!activeClient) return;

      if (isFollowing) {
        await activeClient.client.v1.accounts.$select(accountId).unfollow();
      } else {
        await activeClient.client.v1.accounts.$select(accountId).follow();
      }

      // Refresh relationship status
      await fetchRelationship();
    } catch (error) {
      console.error("[UserProfile] Error toggling follow:", error);
    }
  }, [accountId, isFollowing]);

  const handleAccountMenu = useCallback(() => {
    if (!user) return;

    const options: string[] = [];
    const handlers: (() => void)[] = [];
    const destructiveIndices: number[] = [];

    // Add Follow/Unfollow option
    options.push(isFollowing ? "Unfollow" : "Follow");
    handlers.push(handleFollowToggle);

    // Add Block/Unblock option
    options.push(isBlocking ? "Unblock" : "Block");
    handlers.push(isBlocking ? unblockUser : blockUser);
    if (!isBlocking) {
      destructiveIndices.push(options.length - 1);
    }

    // Add Mute/Unmute option
    options.push(isMuting ? "Unmute" : "Mute");
    handlers.push(isMuting ? unmuteUser : muteUser);
    if (!isMuting) {
      destructiveIndices.push(options.length - 1);
    }

    // Add Report option
    options.push("Report");
    handlers.push(reportUser);
    destructiveIndices.push(options.length - 1);

    // Add Cancel option
    options.push("Cancel");
    handlers.push(() => {}); // No-op for cancel

    const cancelButtonIndex = options.length - 1;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex:
          destructiveIndices.length > 0 ? destructiveIndices[0] : undefined,
        title: `@${user.username}`,
      },
      (buttonIndex: number) => {
        if (buttonIndex !== undefined && buttonIndex < handlers.length) {
          handlers[buttonIndex]();
        }
      },
    );
  }, [
    user,
    isFollowing,
    isBlocking,
    isMuting,
    handleFollowToggle,
    blockUser,
    unblockUser,
    muteUser,
    unmuteUser,
    reportUser,
  ]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorIcon, { color: colors.error }]}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error || ERROR_MESSAGES.UNKNOWN_ERROR}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleClose}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Import centralized HTML utility
  // stripHtml is imported from @lib/utils/html

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Image - Absolutely positioned behind everything */}
      {user.header && (
        <Image
          source={{ uri: user.header }}
          style={[styles.headerImage, { height: 150 + insets.top }]}
          resizeMode="cover"
        />
      )}

      {/* ScrollView with content - This will render on top of header image */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={
          user.header
            ? {
                paddingTop: 150 + insets.top - 40,
                paddingBottom: insets.bottom + 20,
              }
            : { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }
        }
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user.avatar }}
            style={[styles.avatar, { borderColor: colors.background }]}
          />
          {user.bot && (
            <View
              style={[styles.botBadge, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.botBadgeText}>🤖 BOT</Text>
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.text }]}>
              {user.displayName}
            </Text>
            {user.locked && <Text style={styles.lockIcon}>🔒</Text>}
          </View>
          <Text style={[styles.username, { color: colors.textSecondary }]}>
            @{user.acct}
          </Text>

          {/* Bio */}
          {user.note && (
            <Text style={[styles.bio, { color: colors.text }]}>
              {stripHtml(user.note)}
            </Text>
          )}

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {user.statusesCount.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Posts
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {user.followingCount.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Following
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {user.followersCount.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Followers
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleViewFeed}
            >
              <Text style={styles.buttonText}>View Feed</Text>
            </TouchableOpacity>
            <View style={styles.followButton}>
              <Follow accountId={user.id} />
            </View>
          </View>

          {/* Fields */}
          {user.fields && user.fields.length > 0 && (
            <View style={styles.fields}>
              {user.fields.map((field, index) => (
                <View
                  key={index}
                  style={[styles.field, { borderBottomColor: colors.border }]}
                >
                  <Text
                    style={[styles.fieldName, { color: colors.textSecondary }]}
                  >
                    {field.name}
                  </Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {stripHtml(field.value)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Header buttons - Absolutely positioned on top */}
      <View style={[styles.headerButtons, { top: insets.top + 16 }]}>
        {/* Menu button */}
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.card }]}
          onPress={handleAccountMenu}
        >
          <Text style={[styles.headerButtonText, { color: colors.text }]}>
            ⋯
          </Text>
        </TouchableOpacity>

        {/* Close button */}
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.card }]}
          onPress={handleClose}
        >
          <Text style={[styles.headerButtonText, { color: colors.text }]}>
            ✕
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
  },
  headerImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: 150,
    zIndex: 0,
  },
  headerButtons: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerButtonText: {
    fontSize: 20,
    fontWeight: "300",
  },
  content: {
    flex: 1,
  },
  avatarContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
  },
  botBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  botBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  userInfo: {
    paddingHorizontal: 16,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  lockIcon: {
    fontSize: 16,
  },
  username: {
    fontSize: 15,
    marginTop: 4,
    marginBottom: 16,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  stats: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 20,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    alignItems: "center",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  followButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  fields: {
    marginTop: 8,
  },
  field: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  fieldName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 20,
  },
});
