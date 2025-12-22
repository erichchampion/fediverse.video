import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@contexts/ThemeContext";
import { useAuth } from "@contexts/AuthContext";

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * App Menu Modal Component
 * Displays app-level settings and navigation
 * Matches functionality from web app's Menu component
 */
export function MenuModal({ visible, onClose }: MenuModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const { instance, accounts, logout, switchAccount } = useAuth();

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    onClose();
    await logout();
    // Navigate to login screen after logout
    router.replace("/(auth)/login" as any);
  }, [logout, onClose, router]);

  // Handle switch server
  const handleSwitchServer = useCallback(() => {
    onClose();
    // Navigate to login screen which shows account switcher
    router.push("/login");
  }, [router, onClose]);

  // Navigate to info pages
  const handleNavigate = useCallback(
    (route: string) => {
      onClose();
      router.push(route as any);
    },
    [router, onClose],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.menu,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 40 },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            style={styles.menuContent}
            contentContainerStyle={styles.menuContentContainer}
          >
            <Text style={[styles.menuTitle, { color: colors.text }]}>Menu</Text>

            {/* App Settings */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push("/(tabs)/settings" as any);
              }}
            >
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text style={[styles.menuItemText, { color: colors.primary }]}>
                App Settings
              </Text>
            </TouchableOpacity>

            {/* Switch Account */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push("/(modals)/account-switcher" as any);
              }}
            >
              <Text style={styles.menuIcon}>🔄</Text>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: colors.primary }]}>
                  Switch Account
                </Text>
                {accounts.length > 1 && (
                  <View
                    style={[styles.badge, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.badgeText}>{accounts.length}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
              <Text style={styles.menuIcon}>🚪</Text>
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Sign Out
              </Text>
            </TouchableOpacity>

            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />

            {/* Info Links */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate("/(modals)/about")}
            >
              <Text style={styles.menuIcon}>ℹ️</Text>
              <Text style={[styles.menuItemText, { color: colors.primary }]}>
                About
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate("/(modals)/privacy")}
            >
              <Text style={styles.menuIcon}>🔒</Text>
              <Text style={[styles.menuItemText, { color: colors.primary }]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate("/(modals)/terms")}
            >
              <Text style={styles.menuIcon}>📄</Text>
              <Text style={[styles.menuItemText, { color: colors.primary }]}>
                Terms of Use
              </Text>
            </TouchableOpacity>

            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />

            {/* Copyright */}
            <Text style={[styles.copyright, { color: colors.textSecondary }]}>
              © {new Date().getFullYear()} friendlyfediverse.com
            </Text>
            <Text style={[styles.copyright, { color: colors.textSecondary }]}>
              All rights reserved
            </Text>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  menu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: "80%",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 24,
    fontWeight: "300",
  },
  menuContent: {
    paddingHorizontal: 20,
  },
  menuContentContainer: {
    paddingBottom: 20,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  menuIcon: {
    fontSize: 20,
    width: 24,
    textAlign: "center",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    marginVertical: 16,
  },
  copyright: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
