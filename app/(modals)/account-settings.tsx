import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@contexts/ThemeContext";
import { useAuth } from "@contexts/AuthContext";
import { usePreferences } from "@hooks/usePreferences";
import { useProfileUpdate } from "@hooks/useProfileUpdate";
import { Card } from "@components/base";

type Visibility = "public" | "unlisted" | "private" | "direct";
type MediaDisplay = "default" | "show_all" | "hide_all";

/**
 * Account Settings Modal
 * Allows users to configure Mastodon server-side preferences
 */
export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { preferences, isLoading, refresh } = usePreferences();
  const { updatePreferences, isUpdating } = useProfileUpdate();

  // Local state for immediate UI updates
  const [defaultVisibility, setDefaultVisibility] =
    useState<Visibility>("public");
  const [defaultSensitive, setDefaultSensitive] = useState(false);
  const [expandMedia, setExpandMedia] = useState<MediaDisplay>("default");
  const [expandSpoilers, setExpandSpoilers] = useState(false);

  // Sync with preferences when loaded
  useEffect(() => {
    if (preferences) {
      setDefaultVisibility(preferences["posting:default:visibility"]);
      setDefaultSensitive(preferences["posting:default:sensitive"]);
      setExpandMedia(preferences["reading:expand:media"]);
      setExpandSpoilers(preferences["reading:expand:spoilers"]);
    }
  }, [preferences]);

  const handleClose = () => {
    router.back();
  };

  const handleVisibilityChange = async (visibility: Visibility) => {
    setDefaultVisibility(visibility);
    try {
      await updatePreferences({ privacy: visibility });
      // Refresh preferences to confirm the change
      await refresh();
    } catch (error) {
      console.error("Error updating visibility:", error);
      Alert.alert("Error", "Failed to update default visibility");
      // Revert on error
      if (preferences) {
        setDefaultVisibility(preferences["posting:default:visibility"]);
      }
    }
  };

  const handleSensitiveToggle = async (value: boolean) => {
    setDefaultSensitive(value);
    try {
      await updatePreferences({ sensitive: value });
      await refresh();
    } catch (error) {
      console.error("Error updating sensitive setting:", error);
      Alert.alert("Error", "Failed to update sensitive media setting");
      if (preferences) {
        setDefaultSensitive(preferences["posting:default:sensitive"]);
      }
    }
  };

  const handleExpandSpoilersToggle = async (value: boolean) => {
    setExpandSpoilers(value);
    // Note: This preference is read-only via the API
    // It can only be changed through the web interface
    Alert.alert(
      "Note",
      "This preference can currently only be changed through the Mastodon web interface.",
    );
    setExpandSpoilers(!value); // Revert
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          No user logged in
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, paddingTop: insets.top + 16 },
        ]}
      >
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Text style={[styles.headerButtonText, { color: colors.text }]}>
            Done
          </Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Account Settings
        </Text>

        <View style={styles.headerButton} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading preferences...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          {/* Posting Defaults Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Posting Defaults
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { color: colors.textSecondary },
              ]}
            >
              These settings apply to new posts by default
            </Text>

            <Card style={styles.settingsCard}>
              {/* Default Visibility */}
              <View style={styles.settingGroup}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Default Post Visibility
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  Who can see your posts by default
                </Text>

                <View style={styles.radioGroup}>
                  {[
                    {
                      value: "public" as Visibility,
                      label: "Public",
                      desc: "Visible to all",
                    },
                    {
                      value: "unlisted" as Visibility,
                      label: "Unlisted",
                      desc: "Not shown in public timelines",
                    },
                    {
                      value: "private" as Visibility,
                      label: "Followers only",
                      desc: "Only visible to followers",
                    },
                    {
                      value: "direct" as Visibility,
                      label: "Direct",
                      desc: "Only mentioned users",
                    },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.radioOption,
                        {
                          backgroundColor:
                            defaultVisibility === option.value
                              ? colors.primary + "20"
                              : "transparent",
                          borderColor:
                            defaultVisibility === option.value
                              ? colors.primary
                              : colors.border,
                        },
                      ]}
                      onPress={() => handleVisibilityChange(option.value)}
                      disabled={isUpdating}
                    >
                      <View style={styles.radioContent}>
                        <Text
                          style={[
                            styles.radioLabel,
                            {
                              color:
                                defaultVisibility === option.value
                                  ? colors.primary
                                  : colors.text,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.radioDesc,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {option.desc}
                        </Text>
                      </View>
                      {defaultVisibility === option.value && (
                        <Text
                          style={[styles.checkmark, { color: colors.primary }]}
                        >
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />

              {/* Mark Media as Sensitive */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Mark Media as Sensitive
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Automatically mark media as sensitive by default
                  </Text>
                </View>
                <Switch
                  value={defaultSensitive}
                  onValueChange={handleSensitiveToggle}
                  trackColor={{ true: colors.primary }}
                  disabled={isUpdating}
                />
              </View>
            </Card>
          </View>

          {/* Reading Preferences Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Reading Preferences
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { color: colors.textSecondary },
              ]}
            >
              Control how content is displayed in your timeline
            </Text>

            <Card style={styles.settingsCard}>
              {/* Media Display (Read-only) */}
              <View style={styles.settingGroup}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Media Display
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  Current setting:{" "}
                  {expandMedia === "default"
                    ? "Hide sensitive"
                    : expandMedia === "show_all"
                      ? "Show all"
                      : "Hide all"}
                </Text>
                <Text
                  style={[styles.noteText, { color: colors.textSecondary }]}
                >
                  ℹ️ This setting can only be changed through the Mastodon web
                  interface
                </Text>
              </View>

              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />

              {/* Expand Spoilers (Read-only) */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Auto-expand Content Warnings
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Automatically show posts with content warnings
                  </Text>
                  <Text
                    style={[styles.noteText, { color: colors.textSecondary }]}
                  >
                    ℹ️ Change this in the web interface
                  </Text>
                </View>
                <Switch
                  value={expandSpoilers}
                  onValueChange={handleExpandSpoilersToggle}
                  trackColor={{ true: colors.primary }}
                  disabled={true}
                />
              </View>
            </Card>
          </View>

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              💡 These are server-side settings that sync across all Mastodon
              clients. Some preferences can only be changed through the Mastodon
              web interface at{" "}
              {user.url ? new URL(user.url).origin : "your instance"}.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerButton: {
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  settingsCard: {
    padding: 16,
    overflow: "hidden",
  },
  settingGroup: {
    marginBottom: 0,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  radioGroup: {
    marginTop: 12,
  },
  radioOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 8,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  radioDesc: {
    fontSize: 13,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  noteText: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
});
