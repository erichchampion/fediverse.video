import { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@contexts/AuthContext";

/**
 * Landing screen that checks authentication and redirects appropriately
 */
export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Redirect to main feed
        router.replace("/(tabs)/feed/home");
      } else {
        // Redirect to login
        router.replace("/(auth)/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friendly Fediverse</Text>
      <ActivityIndicator size="large" color="#6364FF" />
      <Text style={styles.subtitle}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#6364FF",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginTop: 20,
  },
});
