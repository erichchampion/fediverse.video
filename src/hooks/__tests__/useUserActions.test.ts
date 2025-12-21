/**
 * useUserActions Hook Tests
 * Tests for blocking and muting users
 */

import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useUserActions } from "../useUserActions";
import { getActiveClient } from "@lib/api/client";

// Mock dependencies
jest.mock("@lib/api/client");

// Spy on Alert.alert
const alertSpy = jest.spyOn(Alert, "alert");

describe("useUserActions", () => {
  const mockBlockAccount = jest.fn();
  const mockUnblockAccount = jest.fn();
  const mockMuteAccount = jest.fn();
  const mockUnmuteAccount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();

    (getActiveClient as jest.Mock).mockResolvedValue({
      client: {
        v1: {
          accounts: {
            $select: jest.fn((accountId) => ({
              block: mockBlockAccount,
              unblock: mockUnblockAccount,
              mute: mockMuteAccount,
              unmute: mockUnmuteAccount,
            })),
          },
        },
      },
    });
  });

  describe("blockUser", () => {
    it("should show confirmation dialog before blocking", async () => {
      const { result } = renderHook(() =>
        useUserActions({
          accountId: "user123",
          username: "testuser",
        }),
      );

      await act(async () => {
        await result.current.blockUser();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "Block @testuser?",
        expect.stringContaining("You won't see their posts"),
        expect.arrayContaining([
          expect.objectContaining({ text: "Cancel" }),
          expect.objectContaining({ text: "Block" }),
        ]),
      );
    });

    it("should block user when confirmed", async () => {
      mockBlockAccount.mockResolvedValue({ id: "user123", blocking: true });

      // Mock Alert.alert to auto-confirm
      alertSpy.mockImplementation((title, message, buttons) => {
        const blockButton = buttons?.find((b: any) => b.text === "Block");
        if (blockButton?.onPress) {
          blockButton.onPress();
        }
      });

      const onBlock = jest.fn();
      const { result } = renderHook(() =>
        useUserActions({
          accountId: "user123",
          username: "testuser",
          onBlock,
        }),
      );

      await act(async () => {
        await result.current.blockUser();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockBlockAccount).toHaveBeenCalled();
      expect(onBlock).toHaveBeenCalled();
    });

    it("should not block user when cancelled", async () => {
      // Mock Alert.alert to cancel
      alertSpy.mockImplementation((title, message, buttons) => {
        const cancelButton = buttons?.find((b: any) => b.text === "Cancel");
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      });

      const onBlock = jest.fn();
      const { result } = renderHook(() =>
        useUserActions({
          accountId: "user123",
          username: "testuser",
          onBlock,
        }),
      );

      await act(async () => {
        await result.current.blockUser();
      });

      expect(mockBlockAccount).not.toHaveBeenCalled();
      expect(onBlock).not.toHaveBeenCalled();
    });

    it("should show error alert when blocking fails", async () => {
      mockBlockAccount.mockRejectedValue(new Error("Network error"));

      // Mock Alert.alert to auto-confirm
      alertSpy.mockImplementation((title, message, buttons) => {
        const blockButton = buttons?.find((b: any) => b.text === "Block");
        if (blockButton?.onPress) {
          blockButton.onPress();
        }
      });

      const { result } = renderHook(() =>
        useUserActions({
          accountId: "user123",
          username: "testuser",
        }),
      );

      await act(async () => {
        await result.current.blockUser();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should show error alert (last call)
      const lastCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
      expect(lastCall[0]).toBe("Error");
    });
  });

  describe("muteUser", () => {
    it("should show confirmation dialog before muting", async () => {
      const { result } = renderHook(() =>
        useUserActions({
          accountId: "user123",
          username: "testuser",
        }),
      );

      await act(async () => {
        await result.current.muteUser();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "Mute @testuser?",
        expect.stringContaining("You won't see their posts"),
        expect.arrayContaining([
          expect.objectContaining({ text: "Cancel" }),
          expect.objectContaining({ text: "Mute" }),
        ]),
      );
    });

    it("should mute user when confirmed", async () => {
      mockMuteAccount.mockResolvedValue({ id: "user123", muting: true });

      // Mock Alert.alert to auto-confirm
      alertSpy.mockImplementation((title, message, buttons) => {
        const muteButton = buttons?.find((b: any) => b.text === "Mute");
        if (muteButton?.onPress) {
          muteButton.onPress();
        }
      });

      const onMute = jest.fn();
      const { result } = renderHook(() =>
        useUserActions({
          accountId: "user123",
          username: "testuser",
          onMute,
        }),
      );

      await act(async () => {
        await result.current.muteUser();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockMuteAccount).toHaveBeenCalled();
      expect(onMute).toHaveBeenCalled();
    });

    it("should not mute user when cancelled", async () => {
      // Mock Alert.alert to cancel
      alertSpy.mockImplementation((title, message, buttons) => {
        const cancelButton = buttons?.find((b: any) => b.text === "Cancel");
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      });

      const onMute = jest.fn();
      const { result } = renderHook(() =>
        useUserActions({
          accountId: "user123",
          username: "testuser",
          onMute,
        }),
      );

      await act(async () => {
        await result.current.muteUser();
      });

      expect(mockMuteAccount).not.toHaveBeenCalled();
      expect(onMute).not.toHaveBeenCalled();
    });
  });
});
