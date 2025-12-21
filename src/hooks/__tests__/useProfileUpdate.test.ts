/**
 * useProfileUpdate Hook Tests
 * Tests for updating profile information and account settings
 */

import React from "react";
import {
  renderHook,
  renderHookAsync,
  act,
  waitFor,
} from "@testing-library/react-native";
import { useProfileUpdate } from "../useProfileUpdate";
import { getActiveClient } from "@lib/api/client";
import { useAuth } from "@contexts/AuthContext";

// Wrapper component for React 19 compatibility
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children);
};

// Mock dependencies
jest.mock("@lib/api/client");
jest.mock("@contexts/AuthContext");

describe("useProfileUpdate", () => {
  const mockUpdateCredentials = jest.fn();
  const mockSetUser = jest.fn();
  const mockRefreshAuth = jest.fn();

  const mockUser = {
    id: "user123",
    username: "testuser",
    displayName: "Test User",
    avatar: "https://example.com/avatar.jpg",
    header: "https://example.com/header.jpg",
    followersCount: 100,
    followingCount: 50,
    statusesCount: 200,
    note: "Test bio",
    url: "https://mastodon.social/@testuser",
    acct: "testuser@mastodon.social",
    locked: false,
    bot: false,
    discoverable: true,
    fields: [],
    emojis: [],
  };

  const mockUpdatedAccount = {
    id: "user123",
    username: "testuser",
    displayName: "Updated Name",
    avatar: "https://example.com/avatar.jpg",
    header: "https://example.com/header.jpg",
    followersCount: 100,
    followingCount: 50,
    statusesCount: 200,
    note: "Updated bio",
    url: "https://mastodon.social/@testuser",
    acct: "testuser@mastodon.social",
    locked: false,
    bot: false,
    discoverable: true,
    fields: [],
    emojis: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
      refreshAuth: mockRefreshAuth,
    });

    (getActiveClient as jest.Mock).mockResolvedValue({
      client: {
        v1: {
          accounts: {
            updateCredentials: mockUpdateCredentials,
          },
        },
      },
    });
  });

  describe("updateProfile", () => {
    it("should update profile successfully", async () => {
      mockUpdateCredentials.mockResolvedValue(mockUpdatedAccount);

      const { result } = await renderHookAsync(() => useProfileUpdate());

      expect(result.current.isUpdating).toBe(false);

      await act(async () => {
        await result.current.updateProfile({
          displayName: "Updated Name",
          note: "Updated bio",
        });
      });

      expect(mockUpdateCredentials).toHaveBeenCalledWith({
        displayName: "Updated Name",
        note: "Updated bio",
      });

      expect(mockRefreshAuth).toHaveBeenCalled();

      expect(result.current.error).toBeNull();
    });

    it("should update locked status", async () => {
      mockUpdateCredentials.mockResolvedValue({
        ...mockUpdatedAccount,
        locked: true,
      });

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({ locked: true });
      });

      expect(mockUpdateCredentials).toHaveBeenCalledWith({ locked: true });
      expect(mockRefreshAuth).toHaveBeenCalled();
    });

    it("should update bot status", async () => {
      mockUpdateCredentials.mockResolvedValue({
        ...mockUpdatedAccount,
        bot: true,
      });

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({ bot: true });
      });

      expect(mockUpdateCredentials).toHaveBeenCalledWith({ bot: true });
      expect(mockRefreshAuth).toHaveBeenCalled();
    });

    it("should update discoverable status", async () => {
      mockUpdateCredentials.mockResolvedValue({
        ...mockUpdatedAccount,
        discoverable: false,
      });

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({ discoverable: false });
      });

      expect(mockUpdateCredentials).toHaveBeenCalledWith({
        discoverable: false,
      });
    });

    it("should update profile fields", async () => {
      const fields = [
        { name: "Website", value: "https://example.com" },
        { name: "Location", value: "San Francisco" },
      ];

      mockUpdateCredentials.mockResolvedValue({
        ...mockUpdatedAccount,
        fields,
      });

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({ fieldsAttributes: fields });
      });

      expect(mockUpdateCredentials).toHaveBeenCalledWith({
        fieldsAttributes: fields,
      });
      expect(mockRefreshAuth).toHaveBeenCalled();
    });

    it("should update source preferences", async () => {
      mockUpdateCredentials.mockResolvedValue(mockUpdatedAccount);

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({
          source: {
            privacy: "private",
            sensitive: true,
            language: "en",
          },
        });
      });

      expect(mockUpdateCredentials).toHaveBeenCalledWith({
        source: {
          privacy: "private",
          sensitive: true,
          language: "en",
        },
      });
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Network error");
      mockUpdateCredentials.mockRejectedValue(error);

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        try {
          await result.current.updateProfile({ displayName: "Test" });
        } catch (err) {
          // Expected to throw - error will be caught by hook and set in state
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
      });
      expect(mockSetUser).not.toHaveBeenCalled();
    });

    it("should throw error when no user is logged in", async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        setUser: mockSetUser,
        refreshAuth: mockRefreshAuth,
      });

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await expect(
        act(async () => {
          await result.current.updateProfile({ displayName: "Test" });
        }),
      ).rejects.toThrow("No authenticated user");
    });

    it("should set isUpdating to true during update", async () => {
      let resolvePromise: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockUpdateCredentials.mockReturnValue(updatePromise);

      const { result } = await renderHookAsync(() => useProfileUpdate());

      act(() => {
        result.current.updateProfile({ displayName: "Test" });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(true);
      });

      const updateCall = Promise.resolve();

      resolvePromise!(mockUpdatedAccount);
      await updateCall;

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });
  });

  describe("updateAvatar", () => {
    it("should update avatar successfully", async () => {
      const newAvatar = "file:///path/to/avatar.jpg";
      mockUpdateCredentials.mockResolvedValue({
        ...mockUpdatedAccount,
        avatar: "https://example.com/new-avatar.jpg",
      });

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateAvatar(newAvatar);
      });

      expect(mockUpdateCredentials).toHaveBeenCalledWith({
        avatar: expect.anything(),
      });

      expect(mockRefreshAuth).toHaveBeenCalled();
    });

    it("should handle avatar upload errors", async () => {
      mockUpdateCredentials.mockRejectedValue(new Error("Upload failed"));

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        try {
          await result.current.updateAvatar("file:///path/to/avatar.jpg");
        } catch (err) {
          // Expected to throw - error will be caught by hook and set in state
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Upload failed");
      });
    });
  });

  describe("updateHeader", () => {
    it("should update header successfully", async () => {
      const newHeader = "file:///path/to/header.jpg";
      mockUpdateCredentials.mockResolvedValue({
        ...mockUpdatedAccount,
        header: "https://example.com/new-header.jpg",
      });

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateHeader(newHeader);
      });

      expect(mockUpdateCredentials).toHaveBeenCalledWith({
        header: expect.anything(),
      });

      expect(mockRefreshAuth).toHaveBeenCalled();
    });

    it("should handle header upload errors", async () => {
      mockUpdateCredentials.mockRejectedValue(new Error("Upload failed"));

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        try {
          await result.current.updateHeader("file:///path/to/header.jpg");
        } catch (err) {
          // Expected to throw - error will be caught by hook and set in state
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Upload failed");
      });
    });
  });

  describe("updatePreferences", () => {
    it("should update preferences successfully", async () => {
      mockUpdateCredentials.mockResolvedValue(mockUpdatedAccount);

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        await result.current.updatePreferences({
          privacy: "private",
          sensitive: true,
          language: "en",
        });
      });

      expect(mockUpdateCredentials).toHaveBeenCalledWith({
        source: {
          privacy: "private",
          sensitive: true,
          language: "en",
        },
      });
    });

    it("should handle partial preference updates", async () => {
      mockUpdateCredentials.mockResolvedValue(mockUpdatedAccount);

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        await result.current.updatePreferences({ privacy: "unlisted" });
      });

      expect(mockUpdateCredentials).toHaveBeenCalledWith({
        source: { privacy: "unlisted" },
      });
    });

    it("should handle preference update errors", async () => {
      mockUpdateCredentials.mockRejectedValue(new Error("Update failed"));

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        try {
          await result.current.updatePreferences({ privacy: "private" });
        } catch (err) {
          // Expected to throw - error will be caught by hook and set in state
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Update failed");
      });
    });
  });

  describe("multiple updates", () => {
    it("should handle sequential updates", async () => {
      mockUpdateCredentials.mockResolvedValue(mockUpdatedAccount);

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        await result.current.updateProfile({ displayName: "Name 1" });
      });

      await act(async () => {
        await result.current.updateProfile({ displayName: "Name 2" });
      });

      expect(mockUpdateCredentials).toHaveBeenCalledTimes(2);
    });

    it("should clear errors between updates", async () => {
      mockUpdateCredentials.mockRejectedValueOnce(new Error("First error"));
      mockUpdateCredentials.mockResolvedValueOnce(mockUpdatedAccount);

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await act(async () => {
        try {
          await result.current.updateProfile({ displayName: "Test" });
        } catch (err) {
          // Expected to throw - error will be caught by hook and set in state
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe("First error");
      });

      await act(async () => {
        await result.current.updateProfile({ displayName: "Test 2" });
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe("error handling", () => {
    it("should handle no active client error", async () => {
      (getActiveClient as jest.Mock).mockResolvedValue(null);

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await expect(
        act(async () => {
          await result.current.updateProfile({ displayName: "Test" });
        }),
      ).rejects.toThrow("No active client");
    });

    // TODO: Fix React 19 renderHook unmount issue
    it.skip("should preserve user object on update failure", async () => {
      mockUpdateCredentials.mockRejectedValue(new Error("Update failed"));

      const { result } = await renderHookAsync(() => useProfileUpdate());

      await expect(
        act(async () => {
          await result.current.updateProfile({ displayName: "Test" });
        }),
      ).rejects.toThrow("Update failed");

      // refreshAuth should not be called on error, so setUser should not be called
      expect(mockRefreshAuth).not.toHaveBeenCalled();
      expect(mockSetUser).not.toHaveBeenCalled();
    });
  });
});
