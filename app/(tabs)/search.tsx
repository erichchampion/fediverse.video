import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useTheme } from "@contexts/ThemeContext";
import { useTimelines } from "@contexts/TimelinesContext";
import { getActiveClient } from "@lib/api/client";
import { Avatar } from "@components/base";
import { PostCard } from "@components/feed";
import { transformStatus } from "@lib/api/timeline";
import type { Post } from "@types";

/**
 * Search screen
 * Phase 6: Full implementation
 */

type SearchTab = "accounts" | "posts" | "hashtags";

interface SearchAccount {
  id: string;
  username: string;
  acct: string;
  displayName: string;
  avatar: string;
  followersCount: number;
}

interface SearchHashtag {
  name: string;
  url: string;
  history: { uses: string }[];
}

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { addHashtagFeed } = useTimelines();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("accounts");
  const [isSearching, setIsSearching] = useState(false);

  const [accounts, setAccounts] = useState<SearchAccount[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hashtags, setHashtags] = useState<SearchHashtag[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);

      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      const { client } = activeClient;
      const results = await client.v2.search.list({
        q: searchQuery,
        resolve: true,
        limit: 20,
      });

      // Transform accounts
      const transformedAccounts: SearchAccount[] = (results.accounts || []).map(
        (acc) => ({
          id: acc.id,
          username: acc.username,
          acct: acc.acct,
          displayName: acc.displayName || acc.username,
          avatar: acc.avatar,
          followersCount: acc.followersCount || 0,
        }),
      );

      // Transform statuses
      const transformedPosts = (results.statuses || []).map(transformStatus);

      // Get hashtags
      const transformedHashtags: SearchHashtag[] = (results.hashtags || []).map(
        (tag) => ({
          name: tag.name,
          url: tag.url || "",
          history: tag.history || [],
        }),
      );

      setAccounts(transformedAccounts);
      setPosts(transformedPosts);
      setHashtags(transformedHashtags);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAccountPress = (accountId: string) => {
    router.push(`/(modals)/user-profile?accountId=${accountId}`);
  };

  const handleHashtagPress = (hashtag: string) => {
    addHashtagFeed(hashtag);
    router.push(`/(tabs)/feed/hashtag/${hashtag}` as any);
  };

  const tabs: { key: SearchTab; label: string; icon: string }[] = [
    { key: "accounts", label: "Accounts", icon: "👤" },
    { key: "posts", label: "Posts", icon: "📝" },
    { key: "hashtags", label: "Tags", icon: "#️⃣" },
  ];

  const renderAccount = ({ item }: { item: SearchAccount }) => (
    <TouchableOpacity
      style={[styles.accountItem, { borderBottomColor: colors.border }]}
      onPress={() => handleAccountPress(item.id)}
      activeOpacity={0.7}
    >
      <Avatar uri={item.avatar} size={48} />
      <View style={styles.accountInfo}>
        <Text
          style={[styles.displayName, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.displayName}
        </Text>
        <Text
          style={[styles.username, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          @{item.acct}
        </Text>
        <Text style={[styles.followers, { color: colors.textSecondary }]}>
          {item.followersCount} followers
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: Post }) => <PostCard post={item} />;

  const renderHashtag = ({ item }: { item: SearchHashtag }) => {
    const totalUses = item.history.reduce(
      (sum, h) => sum + parseInt(h.uses || "0", 10),
      0,
    );

    return (
      <TouchableOpacity
        style={[styles.hashtagItem, { borderBottomColor: colors.border }]}
        onPress={() => handleHashtagPress(item.name)}
        activeOpacity={0.7}
      >
        <Text style={[styles.hashtagName, { color: colors.primary }]}>
          #{item.name}
        </Text>
        {totalUses > 0 && (
          <Text style={[styles.hashtagUses, { color: colors.textSecondary }]}>
            {totalUses} posts
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isSearching) return null;

    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>
            🔍
          </Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Search Mastodon
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Find accounts, posts, and hashtags
          </Text>
        </View>
      );
    }

    const currentResults =
      activeTab === "accounts"
        ? accounts
        : activeTab === "posts"
          ? posts
          : hashtags;

    if (currentResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>
            😕
          </Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No results found
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Try a different search term
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      {searchQuery.trim().length > 0 && (
        <View
          style={[styles.tabsContainer, { borderBottomColor: colors.border }]}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const count =
              tab.key === "accounts"
                ? accounts.length
                : tab.key === "posts"
                  ? posts.length
                  : hashtags.length;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && { borderBottomColor: colors.primary },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? colors.primary : colors.textSecondary,
                      fontWeight: isActive ? "600" : "500",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Results */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Searching...
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            (activeTab === "accounts"
              ? accounts
              : activeTab === "posts"
                ? posts
                : hashtags) as any
          }
          renderItem={
            (activeTab === "accounts"
              ? renderAccount
              : activeTab === "posts"
                ? renderPost
                : renderHashtag) as any
          }
          keyExtractor={(item, index) =>
            activeTab === "accounts"
              ? (item as SearchAccount).id
              : activeTab === "posts"
                ? (item as Post).id
                : `${(item as SearchHashtag).name}-${index}`
          }
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            !searchQuery.trim() ||
            (activeTab === "accounts" && accounts.length === 0) ||
            (activeTab === "posts" && posts.length === 0) ||
            (activeTab === "hashtags" && hashtags.length === 0)
              ? styles.emptyList
              : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 8,
  },
  clearIcon: {
    fontSize: 16,
    color: "#999",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    gap: 6,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 14,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  accountItem: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    marginBottom: 4,
  },
  followers: {
    fontSize: 12,
  },
  hashtagItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  hashtagName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  hashtagUses: {
    fontSize: 13,
  },
});
