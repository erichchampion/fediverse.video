import { useState } from "react";
import { Alert } from "react-native";
import { getActiveClient } from "@lib/api/client";

/**
 * Custom hook for user moderation actions
 * Handles blocking, muting, and reporting users
 * Phase 5: Interactions & Compose
 */

interface UseUserActionsOptions {
  accountId: string;
  username: string;
  onBlock?: () => void;
  onMute?: () => void;
  onReport?: () => void;
}

export function useUserActions({
  accountId,
  username,
  onBlock,
  onMute,
  onReport,
}: UseUserActionsOptions) {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Block user with confirmation
   */
  const blockUser = async () => {
    Alert.alert(
      `Block @${username}?`,
      `You won't see their posts or be able to interact with them anymore. They won't be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              setIsProcessing(true);

              const activeClient = await getActiveClient();
              if (!activeClient) {
                throw new Error("No active client");
              }

              const { client } = activeClient;
              await client.v1.accounts.$select(accountId).block();

              onBlock?.();
            } catch (error) {
              console.error("Error blocking user:", error);
              Alert.alert("Error", "Failed to block user. Please try again.");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  /**
   * Unblock user
   */
  const unblockUser = async () => {
    try {
      setIsProcessing(true);

      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      const { client } = activeClient;
      await client.v1.accounts.$select(accountId).unblock();

      onBlock?.(); // Trigger callback to refresh state
    } catch (error) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", "Failed to unblock user. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Mute user with confirmation
   */
  const muteUser = async () => {
    Alert.alert(
      `Mute @${username}?`,
      `You won't see their posts in your timeline anymore. They won't be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mute",
          style: "destructive",
          onPress: async () => {
            try {
              setIsProcessing(true);

              const activeClient = await getActiveClient();
              if (!activeClient) {
                throw new Error("No active client");
              }

              const { client } = activeClient;
              await client.v1.accounts.$select(accountId).mute();

              onMute?.();
            } catch (error) {
              console.error("Error muting user:", error);
              Alert.alert("Error", "Failed to mute user. Please try again.");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  /**
   * Unmute user
   */
  const unmuteUser = async () => {
    try {
      setIsProcessing(true);

      const activeClient = await getActiveClient();
      if (!activeClient) {
        throw new Error("No active client");
      }

      const { client } = activeClient;
      await client.v1.accounts.$select(accountId).unmute();

      onMute?.(); // Trigger callback to refresh state
    } catch (error) {
      console.error("Error unmuting user:", error);
      Alert.alert("Error", "Failed to unmute user. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Report user
   * Shows a placeholder alert for now
   */
  const reportUser = async () => {
    Alert.alert(
      "Report Functionality",
      "Report functionality will be available in a future update.",
      [{ text: "OK" }],
    );
    onReport?.();
  };

  return {
    isProcessing,
    blockUser,
    unblockUser,
    muteUser,
    unmuteUser,
    reportUser,
  };
}
