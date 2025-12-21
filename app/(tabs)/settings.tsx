import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useTheme } from "@contexts/ThemeContext";
import { useAuth } from "@contexts/AuthContext";
import { useSettings } from "@hooks/useSettings";
import { Card } from "@components/base";
import { storageService } from "@lib/storage";

/**
 * Settings screen
 * Phase 6.3: Enhanced with additional settings
 */
export default function SettingsScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const { instance } = useAuth();
  const settings = useSettings();

  // Local state for immediate UI updates
  const [autoPlayMedia, setAutoPlayMedia] = useState(settings.autoPlayMedia);
  const [highQualityUploads, setHighQualityUploads] = useState(
    settings.highQualityUploads,
  );

  // Sync with settings hook when they change
  useEffect(() => {
    setAutoPlayMedia(settings.autoPlayMedia);
    setHighQualityUploads(settings.highQualityUploads);
  }, [settings.autoPlayMedia, settings.highQualityUploads]);

  const handleAutoPlayMediaToggle = async (value: boolean) => {
    if (!instance?.id) return;

    setAutoPlayMedia(value);
    try {
      await storageService.setPreference(instance.id, "autoPlayMedia", value);
    } catch (error) {
      console.error("Error saving preference:", error);
    }
  };

  const handleHighQualityUploadsToggle = async (value: boolean) => {
    if (!instance?.id) return;

    setHighQualityUploads(value);
    try {
      await storageService.setPreference(
        instance.id,
        "highQualityUploads",
        value,
      );
    } catch (error) {
      console.error("Error saving preference:", error);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      "Clear Cache",
      "Are you sure you want to clear all cached data?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await storageService.clearAllCache();
              Alert.alert("Success", "Cache cleared successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to clear cache");
            }
          },
        },
      ],
    );
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "auto") => {
    setTheme(newTheme);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Appearance */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Appearance
        </Text>

        <Card style={styles.settingCard}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => handleThemeChange("light")}
          >
            <Text style={[styles.settingText, { color: colors.text }]}>
              Light Mode
            </Text>
            {theme === "light" && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => handleThemeChange("dark")}
          >
            <Text style={[styles.settingText, { color: colors.text }]}>
              Dark Mode
            </Text>
            {theme === "dark" && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => handleThemeChange("auto")}
          >
            <Text style={[styles.settingText, { color: colors.text }]}>
              Auto (System)
            </Text>
            {theme === "auto" && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        </Card>
      </View>

      {/* Media & Playback */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Media & Playback
        </Text>

        <Card style={styles.settingCard}>
          <View style={styles.settingItem}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingText, { color: colors.text }]}>
                Auto-play Media
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Automatically play videos and GIFs in feed
              </Text>
            </View>
            <Switch
              value={autoPlayMedia}
              onValueChange={handleAutoPlayMediaToggle}
              trackColor={{ true: colors.primary }}
              disabled={settings.isLoading}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingItem}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingText, { color: colors.text }]}>
                High Quality Uploads
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Upload images at full quality
              </Text>
            </View>
            <Switch
              value={highQualityUploads}
              onValueChange={handleHighQualityUploadsToggle}
              trackColor={{ true: colors.primary }}
              disabled={settings.isLoading}
            />
          </View>
        </Card>
      </View>

      {/* Data & Storage */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Data & Storage
        </Text>

        <Card style={styles.settingCard}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleClearCache}
          >
            <View>
              <Text style={[styles.settingText, { color: colors.text }]}>
                Clear Cache
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Remove cached posts and images
              </Text>
            </View>
          </TouchableOpacity>
        </Card>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>

        <Card style={styles.settingCard}>
          <View style={styles.settingItem}>
            <Text style={[styles.settingText, { color: colors.text }]}>
              Version
            </Text>
            <Text
              style={[styles.settingValue, { color: colors.textSecondary }]}
            >
              1.0.0
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingItem}>
            <Text style={[styles.settingText, { color: colors.text }]}>
              Build
            </Text>
            <Text
              style={[styles.settingValue, { color: colors.textSecondary }]}
            >
              Phase 6 Complete
            </Text>
          </View>
        </Card>
      </View>

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          ✅ Phase 6: Advanced Features{"\n"}• Search (accounts, posts,
          hashtags){"\n"}• User profiles with stats{"\n"}• Follow/unfollow
          functionality{"\n"}• Enhanced settings{"\n"}• Media playback controls
          {"\n"}• Storage management
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  settingCard: {
    padding: 0,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  settingText: {
    fontSize: 16,
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  settingValue: {
    fontSize: 14,
  },
  checkmark: {
    fontSize: 20,
    color: "#6364FF",
  },
  actionIcon: {
    fontSize: 20,
    color: "#999",
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
