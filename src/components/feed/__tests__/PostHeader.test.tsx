/**
 * PostHeader Component Tests
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PostHeader } from "../PostHeader";
import type { Account } from "@types";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#FFFFFF",
      card: "#F5F5F5",
      text: "#000000",
      textSecondary: "#666666",
      border: "#E0E0E0",
    },
  }),
}));

jest.mock("@components/base", () => ({
  Avatar: () => null,
}));

const mockAccount: Account = {
  id: "user1",
  username: "testuser",
  displayName: "Test User",
  avatar: "https://example.com/avatar.jpg",
  header: "",
  followersCount: 100,
  followingCount: 50,
  statusesCount: 200,
};

const mockBoostedBy: Account = {
  id: "booster1",
  username: "boosteruser",
  displayName: "Booster User",
  avatar: "https://example.com/booster.jpg",
  header: "",
  followersCount: 200,
  followingCount: 100,
  statusesCount: 300,
};

describe("PostHeader", () => {
  it("should render account display name", () => {
    const { getByText } = render(
      <PostHeader account={mockAccount} createdAt="2024-01-01T12:00:00.000Z" />,
    );

    expect(getByText("Test User")).toBeTruthy();
  });

  it("should render username", () => {
    const { getByText } = render(
      <PostHeader account={mockAccount} createdAt="2024-01-01T12:00:00.000Z" />,
    );

    expect(getByText(/@testuser/)).toBeTruthy();
  });

  it("should show boost indicator when boostedBy is provided", () => {
    const { getByText } = render(
      <PostHeader
        account={mockAccount}
        createdAt="2024-01-01T12:00:00.000Z"
        boostedBy={mockBoostedBy}
      />,
    );

    expect(getByText("Booster User boosted")).toBeTruthy();
  });

  it("should call onAccountClick when account is clicked", () => {
    const mockOnAccountClick = jest.fn();
    const { getByText } = render(
      <PostHeader
        account={mockAccount}
        createdAt="2024-01-01T12:00:00.000Z"
        onAccountClick={mockOnAccountClick}
      />,
    );

    fireEvent.press(getByText("Test User"));

    expect(mockOnAccountClick).toHaveBeenCalledWith(mockAccount.id);
  });

  it("should fallback to username when displayName is empty", () => {
    const accountWithoutDisplayName = {
      ...mockAccount,
      displayName: "",
    };

    const { getByText } = render(
      <PostHeader
        account={accountWithoutDisplayName}
        createdAt="2024-01-01T12:00:00.000Z"
      />,
    );

    expect(getByText("testuser")).toBeTruthy();
  });
});
