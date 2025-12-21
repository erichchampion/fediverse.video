import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { storageService } from "@lib/storage";
import {
  login as apiLogin,
  logout as apiLogout,
  validateToken,
  normalizeInstanceUrl,
} from "@lib/api/auth";
import { createMastodonClient, clearClientCache } from "@lib/api/client";
import type { Instance, AuthData, User } from "@types";

/**
 * Authentication context
 * Phase 1.2: Full OAuth implementation
 */

interface Account {
  instance: Instance;
  user: User;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  instance: Instance | null;
  user: User | null;
  error: string | null;
  accounts: Account[];
}

interface AuthContextType extends AuthState {
  login: (instanceUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (instanceId: string) => Promise<void>;
  removeAccount: (instanceId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    instance: null,
    user: null,
    error: null,
    accounts: [],
  });

  // Load auth state on mount
  useEffect(() => {
    loadAuthState();
  }, []);

  /**
   * Load all accounts and set active one
   * Phase 2.4: Multi-account support
   */
  const loadAllAccounts = async (): Promise<Account[]> => {
    try {
      const instances = await storageService.getAuthenticatedInstances();
      const accounts: Account[] = [];

      for (const instance of instances) {
        const authData = await storageService.getAuthData(instance.id);
        if (!authData) continue;

        try {
          // Validate token
          const isValid = await validateToken(
            instance.url,
            authData.accessToken,
          );
          if (!isValid) {
            console.warn(`Token invalid for instance ${instance.id}`);
            continue;
          }

          // Get user info
          const client = createMastodonClient(
            instance.url,
            authData.accessToken,
          );
          const account = await client.v1.accounts.verifyCredentials();

          accounts.push({
            instance,
            user: {
              id: account.id,
              username: account.username,
              displayName: account.displayName || account.username,
              avatar: account.avatar,
              header: account.header || "",
              followersCount: account.followersCount || 0,
              followingCount: account.followingCount || 0,
              statusesCount: account.statusesCount || 0,
              note: account.note,
              url: account.url,
              acct: account.acct,
              locked: account.locked ?? false,
              bot: account.bot ?? false,
              discoverable: account.discoverable ?? false,
              fields: account.fields,
            },
          });
        } catch (error) {
          console.error(`Error loading account for ${instance.id}:`, error);
        }
      }

      return accounts;
    } catch (error) {
      console.error("Error loading all accounts:", error);
      return [];
    }
  };

  const loadAuthState = async () => {
    try {
      // Initialize storage
      await storageService.initialize();

      // Load all accounts
      const accounts = await loadAllAccounts();

      // Get active instance
      const instance = await storageService.getActiveInstance();
      if (!instance) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          instance: null,
          user: null,
          error: null,
          accounts,
        });
        return;
      }

      // Find active account
      const activeAccount = accounts.find(
        (acc) => acc.instance.id === instance.id,
      );
      if (!activeAccount) {
        // Active instance doesn't have valid auth
        await storageService.setActiveInstance(null);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          instance: null,
          user: null,
          error: "Session expired. Please login again.",
          accounts,
        });
        return;
      }

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        instance: activeAccount.instance,
        user: activeAccount.user,
        error: null,
        accounts,
      });
    } catch (error) {
      console.error("Error loading auth state:", error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        instance: null,
        user: null,
        error: error instanceof Error ? error.message : "Unknown error",
        accounts: [],
      });
    }
  };

  const login = async (instanceUrl: string) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      // 1. Normalize the instance URL first
      const normalizedUrl = normalizeInstanceUrl(instanceUrl);

      // 2. Check if we already have accounts on this server
      // If yes, force re-authentication to allow different account login
      const existingAccounts =
        await storageService.getAccountsForServer(normalizedUrl);
      const forceLogin = existingAccounts.length > 0;

      if (forceLogin) {
        console.info(
          `Server ${normalizedUrl} already has ${existingAccounts.length} account(s). Forcing re-authentication to allow different account login.`,
        );
      }

      // 3. Perform OAuth login (with force login if needed)
      const authData = await apiLogin(instanceUrl, forceLogin);

      // 4. Get user info to obtain account ID (use normalized URL from authData)
      const client = createMastodonClient(
        authData.instanceUrl,
        authData.accessToken,
      );
      const account = await client.v1.accounts.verifyCredentials();

      // 5. Check if this account already exists
      const compositeId = `${authData.instanceUrl}@${account.id}`;
      const existingAccount = await storageService.accountExists(
        authData.instanceUrl,
        account.id,
      );

      if (existingAccount) {
        // Account already exists - treat as token refresh/re-login
        console.info(
          `Account @${account.username} already exists. Refreshing token and switching to account.`,
        );

        // Update auth data with new token
        const enhancedAuthData: AuthData = {
          ...authData,
          accountId: account.id,
          username: account.username,
        };
        await storageService.saveAuthData(compositeId, enhancedAuthData);

        // Update instance last accessed time and switch to it
        await storageService.switchInstance(compositeId);

        // Get updated instance data
        const instances = await storageService.getInstances();
        const instance = instances.find((i) => i.id === compositeId);

        if (!instance) {
          throw new Error("Failed to find account after refresh");
        }

        // Create user object
        const user: User = {
          id: account.id,
          username: account.username,
          displayName: account.displayName || account.username,
          avatar: account.avatar,
          header: account.header || "",
          followersCount: account.followersCount || 0,
          followingCount: account.followingCount || 0,
          statusesCount: account.statusesCount || 0,
          note: account.note,
          url: account.url,
          acct: account.acct,
          locked: account.locked ?? false,
          bot: account.bot ?? false,
          discoverable: account.discoverable ?? false,
          fields: account.fields,
        };

        // Reload all accounts
        const accounts = await loadAllAccounts();

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          instance,
          user,
          error: null,
          accounts,
        });

        console.info(
          "Token refreshed and switched to existing account successfully",
        );
        return;
      }

      // 6. Create NEW instance record with composite ID (use normalized URL)
      const instance: Instance = {
        id: compositeId, // Composite key: url@accountId
        url: authData.instanceUrl, // Use normalized URL from authData
        accountId: account.id, // Mastodon account ID
        username: account.username, // Username for display
        displayName: account.displayName || account.username,
        domain: new URL(authData.instanceUrl).hostname,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isActive: true,
      };

      // 7. Update auth data to include account ID
      const enhancedAuthData: AuthData = {
        ...authData,
        accountId: account.id,
        username: account.username,
      };

      // 8. Save with composite ID
      await storageService.saveInstance(instance);
      await storageService.saveAuthData(compositeId, enhancedAuthData);
      await storageService.setActiveInstance(instance);

      // 9. Create user object
      const user: User = {
        id: account.id,
        username: account.username,
        displayName: account.displayName || account.username,
        avatar: account.avatar,
        header: account.header || "",
        followersCount: account.followersCount || 0,
        followingCount: account.followingCount || 0,
        statusesCount: account.statusesCount || 0,
        note: account.note,
        url: account.url,
        acct: account.acct,
        locked: account.locked ?? false,
        bot: account.bot ?? false,
        discoverable: account.discoverable ?? false,
        fields: account.fields,
      };

      // 10. Reload all accounts to include the new one
      const accounts = await loadAllAccounts();

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        instance,
        user,
        error: null,
        accounts,
      });
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (authState.instance) {
        await apiLogout(authState.instance.id);
        await storageService.deleteInstance(authState.instance.id);
      }

      // Clear client cache
      clearClientCache();

      // Reload accounts after logout
      const accounts = await loadAllAccounts();

      // If there are other accounts, don't set active instance
      // User will need to manually switch
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        instance: null,
        user: null,
        error: null,
        accounts,
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear local state
      const accounts = await loadAllAccounts();
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        instance: null,
        user: null,
        error: null,
        accounts,
      });
    }
  };

  /**
   * Switch to a different account
   * Phase 2.4: Multi-account support
   */
  const switchAccount = async (instanceId: string) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Switch instance in storage
      const instance = await storageService.switchInstance(instanceId);
      if (!instance) {
        throw new Error("Failed to switch instance");
      }

      // Find account in accounts list
      const account = authState.accounts.find(
        (acc) => acc.instance.id === instanceId,
      );
      if (!account) {
        throw new Error("Account not found");
      }

      // Clear client cache for clean slate
      clearClientCache();

      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        instance: account.instance,
        user: account.user,
        error: null,
      }));
    } catch (error) {
      console.error("Switch account error:", error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to switch account",
      }));
      throw error;
    }
  };

  /**
   * Remove an account (logout from specific instance)
   * Phase 2.4: Multi-account support
   */
  const removeAccount = async (instanceId: string) => {
    try {
      // Delete instance and its auth data
      await storageService.deleteInstance(instanceId);

      // Reload accounts
      const accounts = await loadAllAccounts();

      // If removed account was active, clear active state
      if (authState.instance?.id === instanceId) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          instance: null,
          user: null,
          error: null,
          accounts,
        });
      } else {
        // Just update accounts list
        setAuthState((prev) => ({
          ...prev,
          accounts,
        }));
      }
    } catch (error) {
      console.error("Remove account error:", error);
      throw error;
    }
  };

  const refreshAuth = async () => {
    await loadAuthState();
  };

  const clearError = () => {
    setAuthState((prev) => ({ ...prev, error: null }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        switchAccount,
        removeAccount,
        refreshAuth,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
