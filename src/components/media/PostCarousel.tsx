import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { memo, useCallback, useState, useRef, useEffect } from "react";
import type { MediaAttachment } from "@types";
import { useTheme } from "@contexts/ThemeContext";
import { MediaGrid } from "./MediaGrid";

/**
 * PostCarousel Component
 * Displays media attachments in a horizontally scrollable carousel with indicators
 */

export interface PostCarouselProps {
  media: MediaAttachment[];
  sensitive: boolean;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getMediaIcon = (type: string): string => {
  switch (type) {
    case "image":
      return "🖼️";
    case "video":
      return "📺";
    case "gifv":
      return "🎬";
    case "audio":
      return "🎵";
    default:
      return "📎";
  }
};

export const PostCarousel = memo<PostCarouselProps>(function PostCarousel({
  media,
  sensitive,
  currentIndex,
  onIndexChange,
}) {
  const { colors } = useTheme();
  const [isContentVisible, setIsContentVisible] = useState(!sensitive);
  const flatListRef = useRef<FlatList>(null);
  const isLayoutComplete = useRef(false);
  const pendingScrollIndex = useRef<number | null>(null);

  const handleRevealSensitive = useCallback(() => {
    setIsContentVisible(true);
  }, []);

  // Handle layout completion
  const handleLayout = useCallback(() => {
    isLayoutComplete.current = true;

    // If there's a pending scroll, execute it now
    if (pendingScrollIndex.current !== null && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index: pendingScrollIndex.current,
          animated: false,
          viewPosition: 0,
        });
      } catch (error) {
        console.warn("Failed to scroll to index:", error);
      }
      pendingScrollIndex.current = null;
    }
  }, []);

  // Scroll to current index after component mounts or when currentIndex changes
  // Wait for layout to complete before scrolling
  useEffect(() => {
    if (currentIndex > 0 && media.length > 0) {
      if (isLayoutComplete.current && flatListRef.current) {
        // Layout is complete, scroll immediately
        const timer = setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({
              index: currentIndex,
              animated: false,
              viewPosition: 0,
            });
          } catch (error) {
            console.warn("Failed to scroll to index:", error);
          }
        }, 50);
        return () => clearTimeout(timer);
      } else {
        // Layout not complete yet, save the index for later
        pendingScrollIndex.current = currentIndex;
      }
    }
    return undefined;
  }, [currentIndex, media.length]);

  const handleIndicatorPress = useCallback(
    (index: number) => {
      onIndexChange(index);
      try {
        flatListRef.current?.scrollToIndex({ index, animated: true });
      } catch (error) {
        console.warn("Failed to scroll to index:", error);
      }
    },
    [onIndexChange],
  );

  const handleScroll = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      if (index !== currentIndex && index >= 0 && index < media.length) {
        onIndexChange(index);
      }
    },
    [currentIndex, media.length, onIndexChange],
  );

  const renderMediaItem = useCallback(
    ({ item }: { item: MediaAttachment }) => {
      return (
        <View style={[styles.mediaContainer, { width: SCREEN_WIDTH }]}>
          <MediaGrid
            media={[item]}
            sensitive={sensitive && !isContentVisible}
          />
        </View>
      );
    },
    [sensitive, isContentVisible],
  );

  const renderIndicator = useCallback(
    (item: MediaAttachment, index: number) => {
      const icon = getMediaIcon(item.type);
      const isActive = index === currentIndex;

      return (
        <TouchableOpacity
          key={`${item.id}-${index}`}
          testID={`indicator-${index}`}
          style={[styles.indicator, { opacity: isActive ? 1 : 0.5 }]}
          onPress={() => handleIndicatorPress(index)}
          activeOpacity={0.7}
        >
          <Text style={[styles.indicatorIcon, { color: colors.text }]}>
            {icon}
          </Text>
        </TouchableOpacity>
      );
    },
    [currentIndex, colors.text, handleIndicatorPress],
  );

  if (media.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Indicators */}
      <View
        style={[
          styles.indicatorsContainer,
          { backgroundColor: colors.background },
        ]}
      >
        {media.map((item, index) => renderIndicator(item, index))}
      </View>

      {/* Sensitive content overlay */}
      {sensitive && !isContentVisible && (
        <TouchableOpacity
          testID="sensitive-overlay"
          style={[
            styles.sensitiveOverlay,
            { backgroundColor: colors.background },
          ]}
          onPress={handleRevealSensitive}
          activeOpacity={0.9}
        >
          <Text style={[styles.sensitiveTitle, { color: colors.text }]}>
            Sensitive Content
          </Text>
          <Text
            style={[styles.sensitiveSubtitle, { color: colors.textSecondary }]}
          >
            Tap to reveal
          </Text>
        </TouchableOpacity>
      )}

      {/* Media carousel */}
      <FlatList
        ref={flatListRef}
        data={media}
        renderItem={renderMediaItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onLayout={handleLayout}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          // Handle scroll failure gracefully
          const wait = new Promise((resolve) => setTimeout(resolve, 100));
          wait.then(() => {
            try {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              });
            } catch (error) {
              console.warn("Failed to recover from scroll failure:", error);
            }
          });
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  indicatorsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  indicator: {
    padding: 4,
  },
  indicatorIcon: {
    fontSize: 16,
  },
  mediaContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  sensitiveOverlay: {
    position: "absolute",
    top: 48, // Below indicators
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  sensitiveTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  sensitiveSubtitle: {
    fontSize: 14,
  },
});
