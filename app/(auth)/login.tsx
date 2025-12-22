import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import { Button, Input } from "@components/base";
import { ERROR_MESSAGES } from "@lib/constants";
import { normalizeInstanceUrl } from "@lib/api/auth";

/**
 * Login screen - Matches web app design
 * Features:
 * - Simple instance URL input
 * - Mastodon logo background
 * - Browse instances button
 */
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const [instanceUrl, setInstanceUrl] = useState("");

  // Navigate to home feed when authentication succeeds
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace("/(tabs)/feed/home");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogin = async () => {
    if (!instanceUrl.trim()) {
      Alert.alert("Error", "Please enter an instance URL");
      return;
    }

    try {
      clearError();
      // Normalize the URL - automatically adds https:// if missing
      const normalizedUrl = normalizeInstanceUrl(instanceUrl);
      await login(normalizedUrl);
      // Navigation will happen automatically via useEffect when isAuthenticated becomes true
    } catch (err) {
      // Error is already set in AuthContext
      const errorMessage =
        err instanceof Error ? err.message : ERROR_MESSAGES.AUTH_FAILED;

      // Special handling for cancelled OAuth flows when adding second account
      if (errorMessage.includes("cancel")) {
        Alert.alert(
          "Login Cancelled",
          "To add a different account on the same server, you may need to log out of your current session in the browser first.",
          [{ text: "OK" }],
        );
      } else {
        Alert.alert("Login Failed", errorMessage);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Top section: Instance selector */}
          <View style={[styles.topSection, { paddingTop: insets.top + 20 }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Sign In to Mastodon
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your server URL to get started
            </Text>

            <View style={styles.form}>
              <Input
                label="Server URL"
                placeholder="mastodon.social or pixelfed.art"
                value={instanceUrl}
                onChangeText={setInstanceUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                error={error || undefined}
                editable={!isLoading}
                containerStyle={styles.input}
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading || !instanceUrl.trim()}
                fullWidth
                size="large"
              />

              <Button
                title="Browse Popular Servers"
                onPress={() => router.push("/(auth)/instance-selector")}
                variant="ghost"
                disabled={isLoading}
                fullWidth
                style={styles.browseButton}
              />
            </View>
          </View>

          {/* Bottom section: Mastodon logo */}
          <View style={styles.bottomSection}>
            {!isLoading && (
              <View style={styles.logoContainer}>
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text
                  style={[styles.welcomeText, { color: colors.textSecondary }]}
                >
                  Welcome to the Friendly Fediverse
                </Text>
                <Text
                  style={[
                    styles.welcomeSubtext,
                    { color: colors.textSecondary },
                  ]}
                >
                  Connect with your favorite Mastodon server
                </Text>
              </View>
            )}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Connecting to Mastodon...
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    minHeight: "100%",
  },
  topSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    marginBottom: 0,
  },
  browseButton: {
    marginTop: 8,
  },
  bottomSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    minHeight: 300,
  },
  logoContainer: {
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 120,
    height: 120,
    opacity: 0.6,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  welcomeSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
});
