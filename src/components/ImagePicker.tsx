import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ExpoImagePicker from "expo-image-picker";
import { useTheme } from "@contexts/ThemeContext";

interface ImagePickerProps {
  /** Current image URL */
  imageUrl?: string;
  /** Callback when image is selected */
  onImageSelected: (uri: string) => void;
  /** Type of image (avatar is circular, header is rectangular) */
  type: "avatar" | "header";
  /** Whether upload is in progress */
  isUploading?: boolean;
  /** Label for the picker */
  label?: string;
}

/**
 * Image picker component for avatar and header images
 * Supports both camera and gallery selection
 */
export function ImagePicker({
  imageUrl,
  onImageSelected,
  type,
  isUploading = false,
  label,
}: ImagePickerProps) {
  const { colors } = useTheme();

  const requestPermissions = async (isCamera: boolean) => {
    if (isCamera) {
      const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to take photos.",
        );
        return false;
      }
    } else {
      const { status } =
        await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is required to select images.",
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async (useCamera: boolean) => {
    const hasPermission = await requestPermissions(useCamera);
    if (!hasPermission) return;

    try {
      const result = useCamera
        ? await ExpoImagePicker.launchCameraAsync({
            mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === "avatar" ? [1, 1] : [16, 9],
            quality: 0.8,
          })
        : await ExpoImagePicker.launchImageLibraryAsync({
            mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: type === "avatar" ? [1, 1] : [16, 9],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const showImageSourceOptions = () => {
    Alert.alert("Select Image", "Choose an image source", [
      { text: "Camera", onPress: () => pickImage(true) },
      { text: "Photo Library", onPress: () => pickImage(false) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const containerStyle =
    type === "avatar"
      ? [styles.avatarContainer, { borderColor: colors.border }]
      : [styles.headerContainer, { borderColor: colors.border }];

  const imageStyle =
    type === "avatar" ? styles.avatarImage : styles.headerImage;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}

      <TouchableOpacity
        style={containerStyle}
        onPress={showImageSourceOptions}
        disabled={isUploading}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={imageStyle}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.card }]}>
            <Text
              style={[styles.placeholderText, { color: colors.textSecondary }]}
            >
              {type === "avatar" ? "📷" : "🖼️"}
            </Text>
          </View>
        )}

        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!isUploading && (
          <View
            style={[
              styles.editButton,
              { backgroundColor: colors.primary },
              type === "avatar" && styles.editButtonAvatar,
            ]}
          >
            <Text style={styles.editButtonText}>✏️</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {type === "avatar"
          ? "Tap to change your profile picture"
          : "Tap to change your header image"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    overflow: "hidden",
    alignSelf: "center",
    position: "relative",
  },
  headerContainer: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  headerImage: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 48,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  editButtonAvatar: {
    bottom: 4,
    right: 4,
  },
  editButtonText: {
    fontSize: 16,
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
