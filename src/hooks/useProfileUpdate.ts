import { useState } from "react";
import { useAuth } from "@contexts/AuthContext";
import { getActiveClient } from "@lib/api/client";
import type { UpdateCredentialsParams } from "@types";
import type { mastodon } from "masto";

/**
 * Hook to manage profile updates with optimistic updates
 * Provides methods to update profile information and account settings
 */
export function useProfileUpdate() {
  const { user, refreshAuth } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update profile credentials
   * Supports optimistic updates for immediate UI feedback
   */
  const updateProfile = async (params: UpdateCredentialsParams) => {
    if (!user) {
      throw new Error("No authenticated user");
    }

    try {
      setIsUpdating(true);
      setError(null);

      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      // Transform our params to masto.js format
      const mastoParams: any = {};

      if (params.displayName !== undefined) {
        mastoParams.displayName = params.displayName;
      }

      if (params.note !== undefined) {
        mastoParams.note = params.note;
      }

      if (params.locked !== undefined) {
        mastoParams.locked = params.locked;
      }

      if (params.bot !== undefined) {
        mastoParams.bot = params.bot;
      }

      if (params.discoverable !== undefined) {
        mastoParams.discoverable = params.discoverable;
      }

      if (params.fieldsAttributes) {
        mastoParams.fieldsAttributes = params.fieldsAttributes;
      }

      // Handle source preferences
      if (params.source) {
        mastoParams.source = {
          privacy: params.source.privacy,
          sensitive: params.source.sensitive,
          language: params.source.language,
        };
      }

      // Avatar and header need special handling for file uploads
      // We'll handle these separately in the Edit Profile screen

      // Call the API
      const updatedAccount =
        await activeClient.client.v1.accounts.updateCredentials(mastoParams);

      // Refresh auth to get updated user data
      await refreshAuth();

      return updatedAccount;
    } catch (err) {
      console.error("[useProfileUpdate] Error updating profile:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Upload and update avatar image
   */
  const updateAvatar = async (imageUri: string) => {
    try {
      setIsUpdating(true);
      setError(null);

      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      // Create form data for the image
      const formData = new FormData();
      formData.append("avatar", {
        uri: imageUri,
        type: "image/jpeg",
        name: "avatar.jpg",
      } as any);

      // Update credentials with the avatar
      const updatedAccount =
        await activeClient.client.v1.accounts.updateCredentials({
          avatar: formData as any,
        });

      // Refresh auth to get updated user data
      await refreshAuth();

      return updatedAccount;
    } catch (err) {
      console.error("[useProfileUpdate] Error updating avatar:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update avatar";
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Upload and update header image
   */
  const updateHeader = async (imageUri: string) => {
    try {
      setIsUpdating(true);
      setError(null);

      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      // Create form data for the image
      const formData = new FormData();
      formData.append("header", {
        uri: imageUri,
        type: "image/jpeg",
        name: "header.jpg",
      } as any);

      // Update credentials with the header
      const updatedAccount =
        await activeClient.client.v1.accounts.updateCredentials({
          header: formData as any,
        });

      // Refresh auth to get updated user data
      await refreshAuth();

      return updatedAccount;
    } catch (err) {
      console.error("[useProfileUpdate] Error updating header:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update header";
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Update account preferences via source parameter
   */
  const updatePreferences = async (preferences: {
    privacy?: "public" | "unlisted" | "private" | "direct";
    sensitive?: boolean;
    language?: string;
  }) => {
    try {
      setIsUpdating(true);
      setError(null);

      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      // Update via source parameter
      await activeClient.client.v1.accounts.updateCredentials({
        source: preferences,
      });

      // Note: Preferences are read-only via GET /api/v1/preferences
      // They update when we update credentials with source parameter
      return true;
    } catch (err) {
      console.error("[useProfileUpdate] Error updating preferences:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update preferences";
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateProfile,
    updateAvatar,
    updateHeader,
    updatePreferences,
    isUpdating,
    error,
  };
}
