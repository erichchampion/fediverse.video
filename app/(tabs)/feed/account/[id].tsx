import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@contexts/ThemeContext";
import { FeedScreenBase } from "../[id]";

/**
 * Account Feed Screen
 * Displays posts from a specific account
 */
export default function AccountFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  if (!id) {
    console.error("[AccountFeedScreen] No account ID provided");
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            No account ID provided
          </Text>
        </View>
      </View>
    );
  }

  return <FeedScreenBase routeId={`account/${id}`} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
});
