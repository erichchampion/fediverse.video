import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import AccountSwitcherScreen from "../account-switcher";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";

// Mock dependencies
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@contexts/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

/**
 * Tests for account switcher UI with server grouping
 */
describe("AccountSwitcherScreen - Multi-Account Same-Server", () => {
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  };

  const mockTheme = {
    colors: {
      background: "#FFFFFF",
      card: "#F5F5F5",
      text: "#000000",
      textSecondary: "#666666",
      primary: "#6364FF",
      error: "#FF0000",
      border: "#E0E0E0",
    },
  };

  const mockAccount1 = {
    instance: {
      id: "https://mastodon.social@111",
      url: "https://mastodon.social",
      accountId: "111",
      username: "alice",
      displayName: "Alice Wonderland",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: true,
    },
    user: {
      id: "111",
      username: "alice",
      displayName: "Alice Wonderland",
      avatar: "https://example.com/alice.jpg",
    },
  };

  const mockAccount2 = {
    instance: {
      id: "https://mastodon.social@222",
      url: "https://mastodon.social",
      accountId: "222",
      username: "bob",
      displayName: "Bob Builder",
      domain: "mastodon.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: false,
    },
    user: {
      id: "222",
      username: "bob",
      displayName: "Bob Builder",
      avatar: "https://example.com/bob.jpg",
    },
  };

  const mockAccount3 = {
    instance: {
      id: "https://pixelfed.social@333",
      url: "https://pixelfed.social",
      accountId: "333",
      username: "carol",
      displayName: "Carol Photographer",
      domain: "pixelfed.social",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: false,
    },
    user: {
      id: "333",
      username: "carol",
      displayName: "Carol Photographer",
      avatar: "https://example.com/carol.jpg",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseTheme.mockReturnValue(mockTheme as any);
  });

  describe("server grouping", () => {
    it("should group accounts by server URL", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2, mockAccount3],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getByText, getAllByText } = render(<AccountSwitcherScreen />);

      // Check server headers are displayed
      expect(getByText("mastodon.social")).toBeTruthy();
      expect(getByText("pixelfed.social")).toBeTruthy();
    });

    it("should display account count badge for servers with multiple accounts", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2, mockAccount3],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getByText, queryByText } = render(<AccountSwitcherScreen />);

      // mastodon.social has 2 accounts, should show count
      expect(getByText("2")).toBeTruthy();

      // pixelfed.social has 1 account, should not show count
      const pixelfedGroups = queryByText("1");
      expect(pixelfedGroups).toBeFalsy();
    });

    it("should display all accounts under their respective servers", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2, mockAccount3],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getByText } = render(<AccountSwitcherScreen />);

      // All accounts should be visible
      expect(getByText("Alice Wonderland")).toBeTruthy();
      expect(getByText("@alice")).toBeTruthy();
      expect(getByText("Bob Builder")).toBeTruthy();
      expect(getByText("@bob")).toBeTruthy();
      expect(getByText("Carol Photographer")).toBeTruthy();
      expect(getByText("@carol")).toBeTruthy();
    });

    it("should show active badge only on the active account", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getAllByText } = render(<AccountSwitcherScreen />);

      const activeBadges = getAllByText("Active");
      expect(activeBadges).toHaveLength(1);
    });
  });

  describe("account switching", () => {
    it("should call switchAccount when tapping non-active account", async () => {
      const mockSwitchAccount = jest.fn().mockResolvedValue(undefined);

      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        instance: mockAccount1.instance,
        switchAccount: mockSwitchAccount,
        removeAccount: jest.fn(),
      } as any);

      const { getByText } = render(<AccountSwitcherScreen />);

      fireEvent.press(getByText("Bob Builder"));

      await waitFor(() => {
        expect(mockSwitchAccount).toHaveBeenCalledWith(
          "https://mastodon.social@222",
        );
      });
    });

    it("should switch between accounts on the same server", async () => {
      const mockSwitchAccount = jest.fn().mockResolvedValue(undefined);

      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        instance: mockAccount1.instance,
        switchAccount: mockSwitchAccount,
        removeAccount: jest.fn(),
      } as any);

      const { getByText } = render(<AccountSwitcherScreen />);

      // Tap on Bob's account (same server as Alice)
      fireEvent.press(getByText("Bob Builder"));

      await waitFor(() => {
        expect(mockSwitchAccount).toHaveBeenCalledWith(
          mockAccount2.instance.id,
        );
        expect(mockRouter.back).toHaveBeenCalled();
      });
    });

    it("should close modal when tapping Done button", async () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getByText } = render(<AccountSwitcherScreen />);

      fireEvent.press(getByText("Done"));

      await waitFor(() => {
        expect(mockRouter.back).toHaveBeenCalled();
      });
    });

    it("should show error alert if switch fails", async () => {
      const mockSwitchAccount = jest
        .fn()
        .mockRejectedValue(new Error("Switch failed"));

      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        instance: mockAccount1.instance,
        switchAccount: mockSwitchAccount,
        removeAccount: jest.fn(),
      } as any);

      // Mock Alert
      const mockAlert = jest.spyOn(require("react-native").Alert, "alert");

      const { getByText } = render(<AccountSwitcherScreen />);

      fireEvent.press(getByText("Bob Builder"));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          "Switch Failed",
          "Switch failed",
        );
      });
    });
  });

  describe("account removal", () => {
    it("should show remove button for non-active accounts", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getAllByText } = render(<AccountSwitcherScreen />);

      const removeButtons = getAllByText("Remove");
      expect(removeButtons).toHaveLength(1); // Only for Bob (non-active)
    });

    it("should not show remove button for active account", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { queryByText } = render(<AccountSwitcherScreen />);

      const removeButton = queryByText("Remove");
      expect(removeButton).toBeFalsy();
    });

    it("should show confirmation alert when removing account", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const mockAlert = jest.spyOn(require("react-native").Alert, "alert");

      const { getAllByText } = render(<AccountSwitcherScreen />);

      const removeButtons = getAllByText("Remove");
      fireEvent.press(removeButtons[0]);

      expect(mockAlert).toHaveBeenCalledWith(
        "Remove Account",
        expect.stringContaining("@bob"),
        expect.any(Array),
      );
    });

    it("should allow removing one account while keeping another on same server", async () => {
      const mockRemoveAccount = jest.fn().mockResolvedValue(undefined);

      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: mockRemoveAccount,
      } as any);

      const mockAlert = jest
        .spyOn(require("react-native").Alert, "alert")
        .mockImplementation((title, message, buttons: any) => {
          // Simulate pressing "Remove" button
          const removeButton = buttons.find((b: any) => b.text === "Remove");
          if (removeButton) {
            removeButton.onPress();
          }
        });

      const { getAllByText } = render(<AccountSwitcherScreen />);

      const removeButtons = getAllByText("Remove");
      fireEvent.press(removeButtons[0]);

      await waitFor(() => {
        expect(mockRemoveAccount).toHaveBeenCalledWith(
          mockAccount2.instance.id,
        );
      });
    });
  });

  describe("add account", () => {
    it('should navigate to instance selector when tapping "Add Another Account"', () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getByText } = render(<AccountSwitcherScreen />);

      fireEvent.press(getByText("Add Another Account"));

      expect(mockRouter.push).toHaveBeenCalledWith("/(auth)/instance-selector");
    });
  });

  describe("UI layout", () => {
    it("should display accounts grouped and ordered by server", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount3, mockAccount1, mockAccount2],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getByText, UNSAFE_getByType } = render(<AccountSwitcherScreen />);

      // Servers should appear as headers
      expect(getByText("mastodon.social")).toBeTruthy();
      expect(getByText("pixelfed.social")).toBeTruthy();
    });

    it("should show correct username format", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getByText } = render(<AccountSwitcherScreen />);

      // Username should be prefixed with @
      expect(getByText("@alice")).toBeTruthy();
    });

    it("should display server count badge when multiple accounts exist", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1, mockAccount2, mockAccount3],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getByText } = render(<AccountSwitcherScreen />);

      // Should show count "2" for mastodon.social
      expect(getByText("2")).toBeTruthy();
    });
  });

  describe("empty state", () => {
    it("should handle no accounts gracefully", () => {
      mockUseAuth.mockReturnValue({
        accounts: [],
        instance: null,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getByText } = render(<AccountSwitcherScreen />);

      // Should still show "Add Another Account" button
      expect(getByText("Add Another Account")).toBeTruthy();
    });
  });

  describe("single account", () => {
    it("should not show count badge for server with single account", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { queryByText } = render(<AccountSwitcherScreen />);

      // Should not show "1" badge
      expect(queryByText("1")).toBeFalsy();
    });

    it("should show active badge for single account", () => {
      mockUseAuth.mockReturnValue({
        accounts: [mockAccount1],
        instance: mockAccount1.instance,
        switchAccount: jest.fn(),
        removeAccount: jest.fn(),
      } as any);

      const { getByText } = render(<AccountSwitcherScreen />);

      expect(getByText("Active")).toBeTruthy();
    });
  });
});
