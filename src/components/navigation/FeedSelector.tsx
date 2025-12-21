import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useTheme } from "@contexts/ThemeContext";
import { useTimelines } from "@contexts/TimelinesContext";
import type { TimelineOption } from "@shared/types";

/**
 * FeedSelector Component
 * Dropdown menu for selecting different feeds
 * Matches web app's Timelines dropdown
 * First item is Search, followed by dynamic timeline options
 */
export function FeedSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { timelineOptions, isLoading } = useTimelines();

  const getTimelineIcon = (type: TimelineOption["type"]) => {
    switch (type) {
      case "home":
        return "🏠";
      case "public":
        return "🌐";
      case "local":
        return "🏘️";
      case "list":
        return "📋";
      case "hashtag":
        return "🏷️";
      case "account":
        return "👤";
      case "favourites":
        return "❤️";
      case "bookmarks":
        return "🔖";
      default:
        return "📄";
    }
  };

  // Determine current feed based on pathname
  const getCurrentFeed = () => {
    // Check if on search page
    if (pathname.includes("/search")) {
      return { id: "search", name: "Search", icon: "🔍" };
    }

    // Check timeline options
    const currentOption = timelineOptions.find((option) => {
      if (option.type === "home" && pathname.includes("/feed/home"))
        return true;
      if (option.type === "public" && pathname.includes("/feed/public"))
        return true;
      if (option.type === "local" && pathname.includes("/feed/local"))
        return true;
      if (option.type === "favourites" && pathname.includes("/feed/favourites"))
        return true;
      if (option.type === "bookmarks" && pathname.includes("/feed/bookmarks"))
        return true;
      if (
        option.type === "list" &&
        pathname.includes(`/feed/list/${option.id.replace("list:", "")}`)
      )
        return true;
      if (
        option.type === "hashtag" &&
        pathname.includes(`/feed/hashtag/${option.id.replace("hashtag:", "")}`)
      )
        return true;
      if (
        option.type === "account" &&
        pathname.includes(`/feed/account/${option.id.replace("account:", "")}`)
      )
        return true;
      return false;
    });

    if (currentOption) {
      return {
        id: currentOption.id,
        name: currentOption.name,
        icon: getTimelineIcon(currentOption.type),
      };
    }

    // Default to Home
    return { id: "home", name: "Home Feed", icon: "🏠" };
  };

  const currentFeed = getCurrentFeed();

  const handleSelectFeed = (option: TimelineOption) => {
    setIsOpen(false);

    // Navigate based on type
    switch (option.type) {
      case "home":
        router.push("/(tabs)/feed/home");
        break;
      case "public":
        router.push("/(tabs)/feed/public");
        break;
      case "local":
        router.push("/(tabs)/feed/local");
        break;
      case "favourites":
        router.push("/(tabs)/feed/favourites");
        break;
      case "bookmarks":
        router.push("/(tabs)/feed/bookmarks");
        break;
      case "list":
        router.push(
          `/(tabs)/feed/list/${option.id.replace("list:", "")}` as any,
        );
        break;
      case "hashtag":
        router.push(
          `/(tabs)/feed/hashtag/${option.id.replace("hashtag:", "")}` as any,
        );
        break;
      case "account":
        router.push(
          `/(tabs)/feed/account/${option.id.replace("account:", "")}` as any,
        );
        break;
    }
  };

  const handleSearchSelect = () => {
    setIsOpen(false);
    router.push("/(tabs)/search");
  };

  return (
    <View style={styles.container}>
      {/* Dropdown trigger */}
      <TouchableOpacity
        style={[
          styles.trigger,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>{currentFeed.icon}</Text>
        <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
          {currentFeed.name}
        </Text>
        <Text style={[styles.arrow, { color: colors.textSecondary }]}>▼</Text>
      </TouchableOpacity>

      {/* Dropdown modal */}
      <Modal
        visible={isOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdown}>
            <View style={[styles.menu, { backgroundColor: colors.card }]}>
              <ScrollView>
                {/* Search as first item */}
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    currentFeed.id === "search" && {
                      backgroundColor: colors.primary + "20",
                    },
                  ]}
                  onPress={handleSearchSelect}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>🔍</Text>
                  <Text
                    style={[
                      styles.menuLabel,
                      {
                        color:
                          currentFeed.id === "search"
                            ? colors.primary
                            : colors.text,
                      },
                    ]}
                  >
                    Search
                  </Text>
                  {currentFeed.id === "search" && (
                    <Text style={[styles.checkmark, { color: colors.primary }]}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Separator after Search */}
                <View
                  style={[styles.separator, { backgroundColor: colors.border }]}
                />

                {/* Loading state */}
                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}

                {/* Timeline options */}
                {!isLoading &&
                  timelineOptions.map((option) => {
                    const isSelected = option.id === currentFeed.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.menuItem,
                          isSelected && {
                            backgroundColor: colors.primary + "20",
                          },
                        ]}
                        onPress={() => handleSelectFeed(option)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.menuIcon}>
                          {getTimelineIcon(option.type)}
                        </Text>
                        <Text
                          style={[
                            styles.menuLabel,
                            {
                              color: isSelected ? colors.primary : colors.text,
                            },
                          ]}
                        >
                          {option.name}
                        </Text>
                        {isSelected && (
                          <Text
                            style={[
                              styles.checkmark,
                              { color: colors.primary },
                            ]}
                          >
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  arrow: {
    fontSize: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    width: "80%",
    maxWidth: 300,
  },
  menu: {
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  menuIcon: {
    fontSize: 18,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "bold",
  },
  separator: {
    height: 1,
    marginVertical: 8,
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
