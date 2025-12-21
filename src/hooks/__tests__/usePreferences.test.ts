/**
 * usePreferences Hook Tests
 * Tests for fetching and managing Mastodon account preferences
 */

import { renderHook, waitFor, act } from "@testing-library/react-native";
import { usePreferences } from "../usePreferences";
import { getActiveClient } from "@lib/api/client";
import { useAuth } from "@contexts/AuthContext";

// Mock dependencies
jest.mock("@lib/api/client");
jest.mock("@contexts/AuthContext");

describe("usePreferences", () => {
  const mockPreferencesFetch = jest.fn();

  const mockPreferences = {
    "posting:default:visibility": "public" as const,
    "posting:default:sensitive": false,
    "posting:default:language": "en",
    "posting:default:quote_policy": "public" as const,
    "reading:expand:media": "default" as const,
    "reading:expand:spoilers": false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: "user123",
        username: "testuser",
      },
      instance: {
        id: "instance123",
        url: "https://mastodon.social",
      },
    });

    (getActiveClient as jest.Mock).mockResolvedValue({
      client: {
        v1: {
          preferences: {
            fetch: mockPreferencesFetch,
          },
        },
      },
    });
  });

  describe("initial load", () => {
    it("should fetch preferences on mount", async () => {
      mockPreferencesFetch.mockResolvedValue(mockPreferences);

      const { result } = renderHook(() => usePreferences());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.preferences).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPreferencesFetch).toHaveBeenCalledTimes(1);
      expect(result.current.preferences).toEqual(mockPreferences);
      expect(result.current.error).toBeNull();
    });

    it("should handle missing user gracefully", async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        instance: null,
      });

      const { result } = renderHook(() => usePreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPreferencesFetch).not.toHaveBeenCalled();
      expect(result.current.preferences).toBeNull();
    });

    it("should handle fetch errors", async () => {
      const errorMessage = "Network error";
      mockPreferencesFetch.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });

    it("should use default values for missing preference fields", async () => {
      const partialPrefs = {
        "posting:default:visibility": "unlisted" as const,
      };

      mockPreferencesFetch.mockResolvedValue(partialPrefs);

      const { result } = renderHook(() => usePreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences).toEqual({
        "posting:default:visibility": "unlisted",
        "posting:default:sensitive": false,
        "posting:default:language": null,
        "posting:default:quote_policy": undefined,
        "reading:expand:media": "default",
        "reading:expand:spoilers": false,
      });
    });
  });

  describe("refresh", () => {
    it("should refetch preferences when refresh is called", async () => {
      mockPreferencesFetch.mockResolvedValue(mockPreferences);

      const { result } = renderHook(() => usePreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPreferencesFetch).toHaveBeenCalledTimes(1);

      // Call refresh
      const updatedPrefs = {
        ...mockPreferences,
        "posting:default:visibility": "private" as const,
      };
      mockPreferencesFetch.mockResolvedValue(updatedPrefs);

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPreferencesFetch).toHaveBeenCalledTimes(2);
      expect(result.current.preferences?.["posting:default:visibility"]).toBe(
        "private",
      );
    });

    it("should handle refresh errors", async () => {
      mockPreferencesFetch.mockResolvedValue(mockPreferences);

      const { result } = renderHook(() => usePreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger error on refresh
      mockPreferencesFetch.mockRejectedValue(new Error("Refresh failed"));

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe("Refresh failed");
      });
    });

    it("should not refresh when user is not logged in", async () => {
      mockPreferencesFetch.mockResolvedValue(mockPreferences);

      const { result, rerender } = renderHook(() => usePreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Change auth to no user
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        instance: null,
      });

      rerender({});

      const callCountBefore = mockPreferencesFetch.mock.calls.length;
      await result.current.refresh();

      expect(mockPreferencesFetch).toHaveBeenCalledTimes(callCountBefore);
    });
  });

  describe("loading states", () => {
    it("should set isLoading to true during fetch", async () => {
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockPreferencesFetch.mockReturnValue(fetchPromise);

      const { result } = renderHook(() => usePreferences());

      expect(result.current.isLoading).toBe(true);

      resolvePromise!(mockPreferences);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should set isLoading to true during refresh", async () => {
      mockPreferencesFetch.mockResolvedValue(mockPreferences);

      const { result } = renderHook(() => usePreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolveRefresh: (value: any) => void;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });
      mockPreferencesFetch.mockReturnValue(refreshPromise);

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveRefresh!(mockPreferences);
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("preference value handling", () => {
    it("should handle all visibility options", async () => {
      const visibilities = ["public", "unlisted", "private", "direct"] as const;

      for (const visibility of visibilities) {
        mockPreferencesFetch.mockResolvedValue({
          ...mockPreferences,
          "posting:default:visibility": visibility,
        });

        const { result } = renderHook(() => usePreferences());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.preferences?.["posting:default:visibility"]).toBe(
          visibility,
        );
      }
    });

    it("should handle all media display options", async () => {
      const mediaOptions = ["default", "show_all", "hide_all"] as const;

      for (const option of mediaOptions) {
        mockPreferencesFetch.mockResolvedValue({
          ...mockPreferences,
          "reading:expand:media": option,
        });

        const { result } = renderHook(() => usePreferences());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.preferences?.["reading:expand:media"]).toBe(
          option,
        );
      }
    });

    it("should handle boolean preferences correctly", async () => {
      mockPreferencesFetch.mockResolvedValue({
        ...mockPreferences,
        "posting:default:sensitive": true,
        "reading:expand:spoilers": true,
      });

      const { result } = renderHook(() => usePreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences?.["posting:default:sensitive"]).toBe(
        true,
      );
      expect(result.current.preferences?.["reading:expand:spoilers"]).toBe(
        true,
      );
    });

    it("should handle null language preference", async () => {
      mockPreferencesFetch.mockResolvedValue({
        ...mockPreferences,
        "posting:default:language": null,
      });

      const { result } = renderHook(() => usePreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(
        result.current.preferences?.["posting:default:language"],
      ).toBeNull();
    });
  });
});
