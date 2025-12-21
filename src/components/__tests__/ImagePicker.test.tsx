/**
 * ImagePicker Component Tests
 * Tests for avatar and header image selection
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as ExpoImagePicker from "expo-image-picker";
import { ImagePicker } from "../ImagePicker";
import { useTheme } from "@contexts/ThemeContext";

// Mock dependencies
jest.mock("expo-image-picker");
jest.mock("@contexts/ThemeContext");

describe("ImagePicker", () => {
  const mockOnImageSelected = jest.fn();
  const mockColors = {
    background: "#FFFFFF",
    card: "#F5F5F5",
    text: "#000000",
    textSecondary: "#666666",
    border: "#E0E0E0",
    primary: "#6364FF",
    error: "#FF0000",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useTheme as jest.Mock).mockReturnValue({ colors: mockColors });

    // Mock permission requests
    (
      ExpoImagePicker.requestCameraPermissionsAsync as jest.Mock
    ).mockResolvedValue({
      status: "granted",
    });
    (
      ExpoImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({
      status: "granted",
    });
  });

  describe("rendering", () => {
    it("should render avatar picker with placeholder", () => {
      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="avatar" />,
      );

      expect(getByText("📷")).toBeTruthy();
      expect(getByText("Tap to change your profile picture")).toBeTruthy();
    });

    it("should render header picker with placeholder", () => {
      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="header" />,
      );

      expect(getByText("🖼️")).toBeTruthy();
      expect(getByText("Tap to change your header image")).toBeTruthy();
    });

    it("should render with existing image URL", () => {
      const imageUrl = "https://example.com/avatar.jpg";

      const { getByTestId, queryByText } = render(
        <ImagePicker
          imageUrl={imageUrl}
          onImageSelected={mockOnImageSelected}
          type="avatar"
        />,
      );

      // When there's an image URL, the placeholder should not be shown
      expect(queryByText("📷")).toBeNull();
    });

    it("should render with custom label", () => {
      const { getByText } = render(
        <ImagePicker
          onImageSelected={mockOnImageSelected}
          type="avatar"
          label="Custom Label"
        />,
      );

      expect(getByText("Custom Label")).toBeTruthy();
    });

    it("should show loading indicator when uploading", () => {
      const { UNSAFE_getByType } = render(
        <ImagePicker
          onImageSelected={mockOnImageSelected}
          type="avatar"
          isUploading={true}
        />,
      );

      const ActivityIndicator = require("react-native").ActivityIndicator;
      const activityIndicator = UNSAFE_getByType(ActivityIndicator);
      expect(activityIndicator).toBeTruthy();
    });
  });

  describe("image selection", () => {
    it("should show alert with camera and gallery options when tapped", async () => {
      const alertSpy = jest.spyOn(Alert, "alert");

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="avatar" />,
      );

      const placeholder = getByText("📷");
      fireEvent.press(placeholder.parent!);

      expect(alertSpy).toHaveBeenCalledWith(
        "Select Image",
        "Choose an image source",
        expect.arrayContaining([
          expect.objectContaining({ text: "Camera" }),
          expect.objectContaining({ text: "Photo Library" }),
          expect.objectContaining({ text: "Cancel" }),
        ]),
      );

      alertSpy.mockRestore();
    });

    it("should launch camera when camera option is selected", async () => {
      const mockResult = {
        canceled: false,
        assets: [{ uri: "file:///camera/photo.jpg" }],
      };

      (ExpoImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((title, message, buttons) => {
          const cameraButton = buttons?.find((b: any) => b.text === "Camera");
          if (cameraButton?.onPress) {
            cameraButton.onPress();
          }
        });

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="avatar" />,
      );

      fireEvent.press(getByText("📷").parent!);

      await waitFor(() => {
        expect(ExpoImagePicker.launchCameraAsync).toHaveBeenCalledWith({
          mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      });

      await waitFor(() => {
        expect(mockOnImageSelected).toHaveBeenCalledWith(
          "file:///camera/photo.jpg",
        );
      });

      alertSpy.mockRestore();
    });

    it("should launch gallery when photo library option is selected", async () => {
      const mockResult = {
        canceled: false,
        assets: [{ uri: "file:///gallery/photo.jpg" }],
      };

      (ExpoImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((title, message, buttons) => {
          const galleryButton = buttons?.find(
            (b: any) => b.text === "Photo Library",
          );
          if (galleryButton?.onPress) {
            galleryButton.onPress();
          }
        });

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="header" />,
      );

      fireEvent.press(getByText("🖼️").parent!);

      await waitFor(() => {
        expect(ExpoImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
          mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      });

      await waitFor(() => {
        expect(mockOnImageSelected).toHaveBeenCalledWith(
          "file:///gallery/photo.jpg",
        );
      });

      alertSpy.mockRestore();
    });

    it("should use correct aspect ratio for avatar (1:1)", async () => {
      const mockResult = {
        canceled: false,
        assets: [{ uri: "file:///photo.jpg" }],
      };

      (ExpoImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((title, message, buttons) => {
          const galleryButton = buttons?.find(
            (b: any) => b.text === "Photo Library",
          );
          if (galleryButton?.onPress) {
            galleryButton.onPress();
          }
        });

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="avatar" />,
      );

      fireEvent.press(getByText("📷").parent!);

      await waitFor(() => {
        expect(ExpoImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
          expect.objectContaining({ aspect: [1, 1] }),
        );
      });

      alertSpy.mockRestore();
    });

    it("should use correct aspect ratio for header (16:9)", async () => {
      const mockResult = {
        canceled: false,
        assets: [{ uri: "file:///photo.jpg" }],
      };

      (ExpoImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((title, message, buttons) => {
          const galleryButton = buttons?.find(
            (b: any) => b.text === "Photo Library",
          );
          if (galleryButton?.onPress) {
            galleryButton.onPress();
          }
        });

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="header" />,
      );

      fireEvent.press(getByText("🖼️").parent!);

      await waitFor(() => {
        expect(ExpoImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
          expect.objectContaining({ aspect: [16, 9] }),
        );
      });

      alertSpy.mockRestore();
    });

    it("should not call onImageSelected when cancelled", async () => {
      const mockResult = { canceled: true };

      (ExpoImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((title, message, buttons) => {
          const galleryButton = buttons?.find(
            (b: any) => b.text === "Photo Library",
          );
          if (galleryButton?.onPress) {
            galleryButton.onPress();
          }
        });

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="avatar" />,
      );

      fireEvent.press(getByText("📷").parent!);

      await waitFor(() => {
        expect(ExpoImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      expect(mockOnImageSelected).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe("permissions", () => {
    it("should request camera permission when selecting camera", async () => {
      (
        ExpoImagePicker.requestCameraPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "granted",
      });
      (ExpoImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file:///photo.jpg" }],
      });

      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((title, message, buttons) => {
          const cameraButton = buttons?.find((b: any) => b.text === "Camera");
          if (cameraButton?.onPress) {
            cameraButton.onPress();
          }
        });

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="avatar" />,
      );

      fireEvent.press(getByText("📷").parent!);

      await waitFor(() => {
        expect(
          ExpoImagePicker.requestCameraPermissionsAsync,
        ).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });

    it("should request media library permission when selecting gallery", async () => {
      (
        ExpoImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "granted",
      });
      (ExpoImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file:///photo.jpg" }],
      });

      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((title, message, buttons) => {
          const galleryButton = buttons?.find(
            (b: any) => b.text === "Photo Library",
          );
          if (galleryButton?.onPress) {
            galleryButton.onPress();
          }
        });

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="avatar" />,
      );

      fireEvent.press(getByText("📷").parent!);

      await waitFor(() => {
        expect(
          ExpoImagePicker.requestMediaLibraryPermissionsAsync,
        ).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });

    it("should show alert when camera permission is denied", async () => {
      (
        ExpoImagePicker.requestCameraPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "denied",
      });

      const permissionAlertSpy = jest.spyOn(Alert, "alert");
      const sourceAlertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((title, message, buttons) => {
          if (title === "Select Image") {
            const cameraButton = buttons?.find((b: any) => b.text === "Camera");
            if (cameraButton?.onPress) {
              cameraButton.onPress();
            }
          }
        });

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="avatar" />,
      );

      fireEvent.press(getByText("📷").parent!);

      await waitFor(() => {
        expect(permissionAlertSpy).toHaveBeenCalledWith(
          "Permission Required",
          "Camera permission is required to take photos.",
        );
      });

      expect(ExpoImagePicker.launchCameraAsync).not.toHaveBeenCalled();

      permissionAlertSpy.mockRestore();
      sourceAlertSpy.mockRestore();
    });

    it("should show alert when media library permission is denied", async () => {
      (
        ExpoImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "denied",
      });

      const permissionAlertSpy = jest.spyOn(Alert, "alert");
      const sourceAlertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((title, message, buttons) => {
          if (title === "Select Image") {
            const galleryButton = buttons?.find(
              (b: any) => b.text === "Photo Library",
            );
            if (galleryButton?.onPress) {
              galleryButton.onPress();
            }
          }
        });

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="avatar" />,
      );

      fireEvent.press(getByText("📷").parent!);

      await waitFor(() => {
        expect(permissionAlertSpy).toHaveBeenCalledWith(
          "Permission Required",
          "Photo library permission is required to select images.",
        );
      });

      expect(ExpoImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();

      permissionAlertSpy.mockRestore();
      sourceAlertSpy.mockRestore();
    });
  });

  describe("disabled state", () => {
    it("should show loading indicator when isUploading is true", () => {
      const { UNSAFE_getByType } = render(
        <ImagePicker
          onImageSelected={mockOnImageSelected}
          type="avatar"
          isUploading={true}
        />,
      );

      // Check that ActivityIndicator is shown when uploading
      const ActivityIndicator = require("react-native").ActivityIndicator;
      const activityIndicator = UNSAFE_getByType(ActivityIndicator);
      expect(activityIndicator).toBeTruthy();
    });

    it("should not show edit button when uploading", () => {
      const { queryByText } = render(
        <ImagePicker
          onImageSelected={mockOnImageSelected}
          type="avatar"
          isUploading={true}
        />,
      );

      expect(queryByText("✏️")).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should show error alert when image picker throws error", async () => {
      (ExpoImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(
        new Error("Picker error"),
      );

      const errorAlertSpy = jest.spyOn(Alert, "alert");
      const sourceAlertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((title, message, buttons) => {
          if (title === "Select Image") {
            const galleryButton = buttons?.find(
              (b: any) => b.text === "Photo Library",
            );
            if (galleryButton?.onPress) {
              galleryButton.onPress();
            }
          }
        });

      const { getByText } = render(
        <ImagePicker onImageSelected={mockOnImageSelected} type="avatar" />,
      );

      fireEvent.press(getByText("📷").parent!);

      await waitFor(() => {
        expect(errorAlertSpy).toHaveBeenCalledWith(
          "Error",
          "Failed to select image",
        );
      });

      errorAlertSpy.mockRestore();
      sourceAlertSpy.mockRestore();
    });
  });
});
