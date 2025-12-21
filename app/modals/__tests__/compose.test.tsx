/**
 * Compose Modal Tests
 * Testing reply with context functionality
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ComposeModal from "../compose";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#FFFFFF",
      card: "#F5F5F5",
      text: "#000000",
      textSecondary: "#666666",
      border: "#E0E0E0",
      primary: "#1DA1F2",
      error: "#E0245E",
      warning: "#FFA500",
    },
  }),
}));

jest.mock("@contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user1",
      username: "currentuser",
      displayName: "Current User",
      avatar: "https://example.com/avatar.jpg",
    },
  }),
}));

jest.mock("@hooks/useSettings", () => ({
  useSettings: () => ({
    autoPlayMedia: true,
    highQualityUploads: true,
    isLoading: false,
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock("@lib/api/client", () => ({
  getActiveClient: jest.fn(() =>
    Promise.resolve({
      client: {
        v1: {
          statuses: {
            create: jest.fn(() => Promise.resolve({ id: "new-post-id" })),
          },
        },
      },
    }),
  ),
}));

jest.mock("@components/base", () => ({
  Avatar: () => null,
  Button: ({ title, onPress }: any) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("ComposeModal - Reply with Context", () => {
  it("should pre-fill content with @username when replyToUsername is provided", () => {
    const { useLocalSearchParams } = require("expo-router");
    useLocalSearchParams.mockReturnValue({
      replyToUsername: "testuser",
    });

    const { getByPlaceholderText } = render(<ComposeModal />);
    const textInput = getByPlaceholderText("What's on your mind?");

    expect(textInput.props.value).toBe("@testuser ");
  });

  it("should not pre-fill content when no reply context is provided", () => {
    const { useLocalSearchParams } = require("expo-router");
    useLocalSearchParams.mockReturnValue({});

    const { getByPlaceholderText } = render(<ComposeModal />);
    const textInput = getByPlaceholderText("What's on your mind?");

    expect(textInput.props.value).toBe("");
  });

  it("should include replyToId when posting a reply", async () => {
    const { useLocalSearchParams } = require("expo-router");
    useLocalSearchParams.mockReturnValue({
      replyToId: "post123",
      replyToUsername: "testuser",
    });

    const mockCreate = jest.fn(() => Promise.resolve({ id: "new-post-id" }));
    const { getActiveClient } = require("@lib/api/client");
    getActiveClient.mockResolvedValue({
      client: {
        v1: {
          statuses: {
            create: mockCreate,
          },
        },
      },
    });

    const { getByText, getByPlaceholderText } = render(<ComposeModal />);
    const textInput = getByPlaceholderText("What's on your mind?");

    // Add some content
    fireEvent.changeText(textInput, "@testuser Hello!");

    // Tap Post button
    const postButton = getByText("Post");
    fireEvent.press(postButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "@testuser Hello!",
          inReplyToId: "post123",
        }),
      );
    });
  });

  it("should not include replyToId when posting without reply context", async () => {
    const { useLocalSearchParams } = require("expo-router");
    useLocalSearchParams.mockReturnValue({});

    const mockCreate = jest.fn(() => Promise.resolve({ id: "new-post-id" }));
    const { getActiveClient } = require("@lib/api/client");
    getActiveClient.mockResolvedValue({
      client: {
        v1: {
          statuses: {
            create: mockCreate,
          },
        },
      },
    });

    const { getByText, getByPlaceholderText } = render(<ComposeModal />);
    const textInput = getByPlaceholderText("What's on your mind?");

    // Add some content
    fireEvent.changeText(textInput, "Hello world!");

    // Tap Post button
    const postButton = getByText("Post");
    fireEvent.press(postButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "Hello world!",
        }),
      );

      // Should not have inReplyToId
      expect(mockCreate).toHaveBeenCalledWith(
        expect.not.objectContaining({
          inReplyToId: expect.anything(),
        }),
      );
    });
  });

  it("should show reply context indicator when replying", () => {
    const { useLocalSearchParams } = require("expo-router");
    useLocalSearchParams.mockReturnValue({
      replyToId: "post123",
      replyToUsername: "testuser",
      replyToContent: "Original post content",
    });

    const { getByText } = render(<ComposeModal />);

    expect(getByText(/Replying to @testuser/)).toBeTruthy();
  });
});
