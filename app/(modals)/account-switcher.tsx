import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@contexts/AuthContext";
import { useTheme } from "@contexts/ThemeContext";
import { Avatar, Button, Card } from "@components/base";

/**
 * Account Switcher Modal
 * Phase 2.4: Multi-account support
 */
export default function AccountSwitcherScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accounts, instance, switchAccount, removeAccount } = useAuth();
  const { colors } = useTheme();

  const handleSwitchAccount = async (instanceId: string) => {
    if (instanceId === instance?.id) {
      // Already active account, just close modal
      router.back();
      return;
    }

    try {
      await switchAccount(instanceId);
      router.back();
    } catch (error) {
      Alert.alert(
        "Switch Failed",
        error instanceof Error ? error.message : "Failed to switch account",
      );
    }
  };

  const handleRemoveAccount = (instanceId: string, username: string) => {
    Alert.alert(
      "Remove Account",
      `Are you sure you want to remove @${username}? You will need to log in again to use this account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeAccount(instanceId);
              if (accounts.length <= 1) {
                // No more accounts, go back to login
                router.replace("/(auth)/login");
              }
            } catch (error) {
              Alert.alert("Error", "Failed to remove account");
            }
          },
        },
      ],
    );
  };

  const handleAddAccount = () => {
    router.push("/(auth)/instance-selector");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Switch Account
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.closeButton, { color: colors.primary }]}>
            Done
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Group accounts by server */}
        {(() => {
          // Group accounts by server URL
          const accountsByServer = accounts.reduce(
            (acc, account) => {
              const serverUrl = account.instance.url;
              if (!acc[serverUrl]) {
                acc[serverUrl] = [];
              }
              acc[serverUrl].push(account);
              return acc;
            },
            {} as Record<string, typeof accounts>,
          );

          return Object.entries(accountsByServer).map(
            ([serverUrl, serverAccounts]) => {
              const serverDomain = new URL(serverUrl).hostname;

              return (
                <View key={serverUrl} style={styles.serverGroup}>
                  {/* Server header */}
                  <View style={styles.serverHeader}>
                    <Text
                      style={[
                        styles.serverName,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {serverDomain}
                    </Text>
                    {serverAccounts.length > 1 && (
                      <View
                        style={[
                          styles.countBadge,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[styles.countText, { color: colors.text }]}
                        >
                          {serverAccounts.length}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Accounts for this server */}
                  {serverAccounts.map((account) => {
                    const isActive = account.instance.id === instance?.id;

                    return (
                      <Card
                        key={account.instance.id}
                        style={styles.accountCard}
                      >
                        <TouchableOpacity
                          style={styles.accountItem}
                          onPress={() =>
                            handleSwitchAccount(account.instance.id)
                          }
                          disabled={isActive}
                        >
                          <Avatar uri={account.user.avatar} size={48} />
                          <View style={styles.accountInfo}>
                            <View style={styles.accountHeader}>
                              <Text
                                style={[
                                  styles.displayName,
                                  { color: colors.text },
                                ]}
                              >
                                {account.user.displayName}
                              </Text>
                              {isActive && (
                                <View
                                  style={[
                                    styles.activeBadge,
                                    { backgroundColor: colors.primary },
                                  ]}
                                >
                                  <Text style={styles.activeBadgeText}>
                                    Active
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text
                              style={[
                                styles.username,
                                { color: colors.textSecondary },
                              ]}
                            >
                              @{account.user.username}
                            </Text>
                          </View>

                          {!isActive && (
                            <TouchableOpacity
                              style={styles.removeButton}
                              onPress={() =>
                                handleRemoveAccount(
                                  account.instance.id,
                                  account.user.username,
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.removeButtonText,
                                  { color: colors.error },
                                ]}
                              >
                                Remove
                              </Text>
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      </Card>
                    );
                  })}
                </View>
              );
            },
          );
        })()}

        {/* Add Account Button */}
        <Button
          title="Add Another Account"
          onPress={handleAddAccount}
          variant="outline"
          fullWidth
          style={styles.addButton}
        />

        {/* Info text */}
        <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            You can add multiple accounts and switch between them easily. Each
            account maintains its own settings and cached data.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  closeButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  serverGroup: {
    marginBottom: 24,
  },
  serverHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  serverName: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
  },
  accountCard: {
    marginBottom: 12,
    padding: 0,
    overflow: "hidden",
  },
  accountItem: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  username: {
    fontSize: 14,
    marginBottom: 2,
  },
  instance: {
    fontSize: 12,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
