import { View, StyleSheet } from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import { Skeleton } from "@components/base/Skeleton";

/**
 * Post Card Skeleton
 * Phase 7: Skeleton loading state for posts
 */

export function PostCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          {/* Avatar */}
          <Skeleton width={48} height={48} borderRadius={24} />

          {/* User info */}
          <View style={styles.headerInfo}>
            <Skeleton width={120} height={16} style={styles.marginBottom} />
            <Skeleton width={160} height={14} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.body}>
          <Skeleton width="100%" height={16} style={styles.marginBottom} />
          <Skeleton width="95%" height={16} style={styles.marginBottom} />
          <Skeleton width="88%" height={16} />
        </View>

        {/* Media placeholder */}
        <Skeleton
          width="100%"
          height={200}
          borderRadius={8}
          style={styles.marginBottom}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Skeleton width={60} height={16} />
          <Skeleton width={60} height={16} />
          <Skeleton width={60} height={16} />
          <Skeleton width={40} height={16} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  body: {
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
  },
  marginBottom: {
    marginBottom: 8,
  },
});
