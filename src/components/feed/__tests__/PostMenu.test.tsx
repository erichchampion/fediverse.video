/**
 * PostMenu Component Tests
 * Tests for the three-dot menu functionality with delete option
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PostMenu } from "../PostMenu";

// Mock the action sheet hook
const mockShowActionSheetWithOptions = jest.fn();

jest.mock("@expo/react-native-action-sheet", () => ({
  useActionSheet: () => ({
    showActionSheetWithOptions: mockShowActionSheetWithOptions,
  }),
}));

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#FFFFFF",
      text: "#000000",
      textSecondary: "#666666",
      border: "#E0E0E0",
      error: "#FF0000",
    },
  }),
}));

// Mock useUserActions hook
jest.mock("@hooks/useUserActions", () => ({
  useUserActions: () => ({
    isProcessing: false,
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    muteUser: jest.fn(),
    unmuteUser: jest.fn(),
    reportUser: jest.fn(),
  }),
}));

describe("PostMenu", () => {
  const defaultProps = {
    postId: "123",
    postUrl: "https://mastodon.social/@user/123",
    accountId: "user123",
    username: "testuser",
    onReply: jest.fn(),
    onToggleBoost: jest.fn(),
    onToggleFavorite: jest.fn(),
    onToggleBookmark: jest.fn(),
    onShare: jest.fn(),
    onDelete: jest.fn(),
    repliesCount: 5,
    reblogsCount: 10,
    favouritesCount: 15,
    reblogged: false,
    favourited: false,
    bookmarked: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render menu button", () => {
    const { getByTestId } = render(
      <PostMenu {...defaultProps} isOwnPost={false} />,
    );

    expect(getByTestId("post-menu-button")).toBeTruthy();
  });

  it("should have proper accessibility attributes", () => {
    const { getByTestId } = render(
      <PostMenu {...defaultProps} isOwnPost={false} />,
    );

    const button = getByTestId("post-menu-button");
    expect(button.props.accessibilityLabel).toBe("More options");
    expect(button.props.accessibilityHint).toBe(
      "Opens menu with additional actions",
    );
    expect(button.props.accessibilityRole).toBe("button");
  });

  it("should render for own posts", () => {
    const { getByTestId } = render(
      <PostMenu {...defaultProps} isOwnPost={true} />,
    );

    expect(getByTestId("post-menu-button")).toBeTruthy();
  });

  it("should show action sheet when menu button is pressed", () => {
    const { getByTestId } = render(
      <PostMenu {...defaultProps} isOwnPost={false} />,
    );

    fireEvent.press(getByTestId("post-menu-button"));

    expect(mockShowActionSheetWithOptions).toHaveBeenCalled();
  });

  describe("Delete option for own posts", () => {
    it("should include delete option in menu when isOwnPost is true", () => {
      const { getByTestId } = render(
        <PostMenu {...defaultProps} isOwnPost={true} />,
      );

      fireEvent.press(getByTestId("post-menu-button"));

      const callArgs = mockShowActionSheetWithOptions.mock.calls[0][0];
      expect(callArgs.options).toContain("Delete");
      expect(callArgs.destructiveButtonIndex).toBeDefined();
    });

    it("should mark delete option as destructive", () => {
      const { getByTestId } = render(
        <PostMenu {...defaultProps} isOwnPost={true} />,
      );

      fireEvent.press(getByTestId("post-menu-button"));

      const callArgs = mockShowActionSheetWithOptions.mock.calls[0][0];
      const deleteIndex = callArgs.options.indexOf("Delete");
      expect(callArgs.destructiveButtonIndex).toBe(deleteIndex);
    });

    it("should call onDelete when delete option is selected", () => {
      const onDelete = jest.fn();
      const { getByTestId } = render(
        <PostMenu {...defaultProps} isOwnPost={true} onDelete={onDelete} />,
      );

      fireEvent.press(getByTestId("post-menu-button"));

      // Simulate selecting the delete option
      const callback = mockShowActionSheetWithOptions.mock.calls[0][1];
      const callArgs = mockShowActionSheetWithOptions.mock.calls[0][0];
      const deleteIndex = callArgs.options.indexOf("Delete");
      callback(deleteIndex);

      expect(onDelete).toHaveBeenCalled();
    });
  });

  describe("Delete option for other users posts", () => {
    it("should not include delete option when isOwnPost is false", () => {
      const { getByTestId } = render(
        <PostMenu {...defaultProps} isOwnPost={false} />,
      );

      fireEvent.press(getByTestId("post-menu-button"));

      const callArgs = mockShowActionSheetWithOptions.mock.calls[0][0];
      expect(callArgs.options).not.toContain("Delete");
    });

    it("should not have destructive button when isOwnPost is false", () => {
      const { getByTestId } = render(
        <PostMenu {...defaultProps} isOwnPost={false} />,
      );

      fireEvent.press(getByTestId("post-menu-button"));

      const callArgs = mockShowActionSheetWithOptions.mock.calls[0][0];
      expect(callArgs.destructiveButtonIndex).toBeUndefined();
    });
  });

  describe("Menu options", () => {
    it("should include all standard options", () => {
      const { getByTestId } = render(
        <PostMenu {...defaultProps} isOwnPost={false} />,
      );

      fireEvent.press(getByTestId("post-menu-button"));

      const callArgs = mockShowActionSheetWithOptions.mock.calls[0][0];
      expect(callArgs.options).toContain("Reply (5)");
      expect(callArgs.options).toContain("Boost (10)");
      expect(callArgs.options).toContain("Favorite (15)");
      expect(callArgs.options).toContain("Bookmark");
      expect(callArgs.options).toContain("Share");
      expect(callArgs.options).toContain("Copy Link");
      expect(callArgs.options).toContain("Cancel");
    });

    it("should call onReply when reply option is selected", () => {
      const onReply = jest.fn();
      const { getByTestId } = render(
        <PostMenu {...defaultProps} isOwnPost={false} onReply={onReply} />,
      );

      fireEvent.press(getByTestId("post-menu-button"));

      const callback = mockShowActionSheetWithOptions.mock.calls[0][1];
      callback(0); // Reply is first option

      expect(onReply).toHaveBeenCalled();
    });
  });
});
