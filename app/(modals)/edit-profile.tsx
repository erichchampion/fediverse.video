import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@contexts/ThemeContext";
import { useAuth } from "@contexts/AuthContext";
import { useProfileUpdate } from "@hooks/useProfileUpdate";
import { ImagePicker } from "@components/ImagePicker";
import { Card } from "@components/base";
import type { ProfileFieldUpdate } from "@types";
import { UI_CONFIG } from "@/config";

/**
 * Edit Profile Modal
 * Allows users to update their Mastodon profile information
 */
export default function EditProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { updateProfile, updateAvatar, updateHeader, isUpdating } =
    useProfileUpdate();

  // Form state
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.note || "");
  const [locked, setLocked] = useState(user?.locked || false);
  const [bot, setBot] = useState(user?.bot || false);
  const [discoverable, setDiscoverable] = useState(user?.discoverable || false);
  const [fields, setFields] = useState<ProfileFieldUpdate[]>(
    user?.fields || [],
  );
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [headerUri, setHeaderUri] = useState<string | undefined>();
  const [hasChanges, setHasChanges] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isHeaderUploading, setIsHeaderUploading] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      displayName !== (user?.displayName || "") ||
      bio !== (user?.note || "") ||
      locked !== (user?.locked || false) ||
      bot !== (user?.bot || false) ||
      discoverable !== (user?.discoverable || false) ||
      JSON.stringify(fields) !== JSON.stringify(user?.fields || []) ||
      avatarUri !== undefined ||
      headerUri !== undefined;

    setHasChanges(changed);
  }, [
    displayName,
    bio,
    locked,
    bot,
    discoverable,
    fields,
    avatarUri,
    headerUri,
    user,
  ]);

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      // Upload avatar if changed
      if (avatarUri) {
        setIsAvatarUploading(true);
        await updateAvatar(avatarUri);
        setIsAvatarUploading(false);
      }

      // Upload header if changed
      if (headerUri) {
        setIsHeaderUploading(true);
        await updateHeader(headerUri);
        setIsHeaderUploading(false);
      }

      // Update profile information
      await updateProfile({
        displayName,
        note: bio,
        locked,
        bot,
        discoverable,
        fieldsAttributes: fields.length > 0 ? fields : undefined,
      });

      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  const handleAvatarSelected = (uri: string) => {
    setAvatarUri(uri);
  };

  const handleHeaderSelected = (uri: string) => {
    setHeaderUri(uri);
  };

  const addField = () => {
    if (fields.length >= UI_CONFIG.PROFILE_MAX_FIELDS) {
      Alert.alert(
        "Limit Reached",
        `You can only have up to ${UI_CONFIG.PROFILE_MAX_FIELDS} profile fields`,
      );
      return;
    }
    setFields([...fields, { name: "", value: "" }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: "name" | "value", value: string) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    setFields(newFields);
  };

  const bioLength = bio.length;
  const bioMaxLength = UI_CONFIG.PROFILE_BIO_MAX_LENGTH;
  const displayNameMaxLength = UI_CONFIG.PROFILE_DISPLAY_NAME_MAX_LENGTH;

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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, paddingTop: insets.top + 16 },
        ]}
      >
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Text style={[styles.headerButtonText, { color: colors.text }]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Edit Profile
        </Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleSave}
          disabled={!hasChanges || isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.headerButtonText,
                {
                  color: hasChanges ? colors.primary : colors.textSecondary,
                  fontWeight: "600",
                },
              ]}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Image */}
        <ImagePicker
          imageUrl={headerUri || user.header}
          onImageSelected={handleHeaderSelected}
          type="header"
          isUploading={isHeaderUploading}
          label="Header Image"
        />

        {/* Avatar */}
        <ImagePicker
          imageUrl={avatarUri || user.avatar}
          onImageSelected={handleAvatarSelected}
          type="avatar"
          isUploading={isAvatarUploading}
          label="Profile Picture"
        />

        {/* Display Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Display Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name"
            placeholderTextColor={colors.textSecondary}
            maxLength={displayNameMaxLength}
          />
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {displayName.length}/{displayNameMaxLength}
          </Text>
        </View>

        {/* Bio */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself"
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={bioMaxLength}
            textAlignVertical="top"
          />
          <Text
            style={[
              styles.charCount,
              {
                color:
                  bioLength > bioMaxLength
                    ? colors.error
                    : colors.textSecondary,
              },
            ]}
          >
            {bioLength}/{bioMaxLength}
          </Text>
        </View>

        {/* Profile Fields */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Profile Metadata ({fields.length}/4)
            </Text>
            {fields.length < 4 && (
              <TouchableOpacity onPress={addField}>
                <Text style={[styles.addButton, { color: colors.primary }]}>
                  + Add Field
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {fields.map((field, index) => (
            <Card key={index} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Field {index + 1}
                </Text>
                <TouchableOpacity onPress={() => removeField(index)}>
                  <Text style={[styles.removeButton, { color: colors.error }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={field.name}
                onChangeText={(value) => updateField(index, "name", value)}
                placeholder="Label (e.g., Website, Pronouns)"
                placeholderTextColor={colors.textSecondary}
                maxLength={255}
              />

              <TextInput
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                  styles.fieldInputLast,
                ]}
                value={field.value}
                onChangeText={(value) => updateField(index, "value", value)}
                placeholder="Value"
                placeholderTextColor={colors.textSecondary}
                maxLength={255}
              />
            </Card>
          ))}

          {fields.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add custom fields to your profile (Website, Location, Pronouns,
              etc.)
            </Text>
          )}
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Account Settings
          </Text>

          <Card style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Lock Account
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  Require approval for new followers
                </Text>
              </View>
              <Switch
                value={locked}
                onValueChange={setLocked}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Bot Account
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  Mark this as an automated account
                </Text>
              </View>
              <Switch
                value={bot}
                onValueChange={setBot}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Discoverable
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  Allow your account to appear in discovery features
                </Text>
              </View>
              <Switch
                value={discoverable}
                onValueChange={setDiscoverable}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  charCount: {
    fontSize: 13,
    textAlign: "right",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  addButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  fieldCard: {
    padding: 12,
    marginBottom: 12,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  removeButton: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  fieldInputLast: {
    marginBottom: 0,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
  },
  settingsCard: {
    padding: 0,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
});
