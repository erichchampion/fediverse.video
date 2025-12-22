import { createRestAPIClient } from "masto";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { storageService } from "@lib/storage";
import type { AuthData } from "@types";
import { APP_CONFIG } from "@config/index";

/**
 * OAuth Authentication Module
 * Phase 1.2: OAuth implementation
 */

// Enable WebBrowser to handle redirects properly on iOS
WebBrowser.maybeCompleteAuthSession();

interface AppRegistration {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Normalize instance URL
 */
export function normalizeInstanceUrl(url: string): string {
  let normalized = url.trim().toLowerCase();

  // Remove protocol if present
  normalized = normalized.replace(/^https?:\/\//, "");

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, "");

  // Add https protocol
  return `https://${normalized}`;
}

/**
 * Get redirect URI for OAuth
 */
export function getRedirectUri(): string {
  // Use AuthSession.makeRedirectUri for Expo SDK 51+
  // This creates a proper redirect URI based on the app's scheme
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "friendlyfediverse.com",
    path: "oauth-callback",
  });

  console.info("Generated redirect URI:", redirectUri);
  return redirectUri;
}

/**
 * Register app with Mastodon instance
 */
export async function registerApp(
  instanceUrl: string,
): Promise<AppRegistration> {
  const normalizedUrl = normalizeInstanceUrl(instanceUrl);
  const redirectUri = getRedirectUri();

  try {
    const client = createRestAPIClient({
      url: normalizedUrl,
    });

    const app = await client.v1.apps.create({
      clientName: APP_CONFIG.APP_NAME,
      redirectUris: redirectUri,
      scopes: "read write follow push",
      website: "https://friendlyfediverse.com",
    });

    if (!app.clientId || !app.clientSecret) {
      throw new Error("App registration failed: missing credentials");
    }

    return {
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      redirectUri,
    };
  } catch (error) {
    console.error("Error registering app:", error);
    throw new Error(
      `Failed to register app with ${normalizedUrl}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Start OAuth authorization flow
 * @param forceLogin - If true, forces re-authentication even if already logged in
 */
export async function startOAuthFlow(
  instanceUrl: string,
  appRegistration: AppRegistration,
  forceLogin: boolean = false,
): Promise<WebBrowser.WebBrowserAuthSessionResult> {
  const normalizedUrl = normalizeInstanceUrl(instanceUrl);

  // Build authorization URL parameters
  const params: Record<string, string> = {
    client_id: appRegistration.clientId,
    redirect_uri: appRegistration.redirectUri,
    response_type: "code",
    scope: "read write follow push",
  };

  // Force re-authentication for multi-account same-server support
  // max_age=0 forces the user to re-authenticate even if they have an active session
  if (forceLogin) {
    params.max_age = "0";
  }

  const authUrl = `${normalizedUrl}/oauth/authorize?${new URLSearchParams(params).toString()}`;

  console.info("Starting OAuth flow", { forceLogin, url: authUrl });

  try {
    // Open browser for authorization using WebBrowser API (Expo SDK 51+)
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      appRegistration.redirectUri,
    );

    return result;
  } catch (error) {
    console.error("Error in OAuth flow:", error);
    throw new Error(
      `OAuth flow failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  instanceUrl: string,
  code: string,
  appRegistration: AppRegistration,
): Promise<string> {
  const normalizedUrl = normalizeInstanceUrl(instanceUrl);

  try {
    // Use direct fetch instead of masto client to avoid encoding issues
    const response = await fetch(`${normalizedUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: appRegistration.clientId,
        client_secret: appRegistration.clientSecret,
        redirect_uri: appRegistration.redirectUri,
        grant_type: "authorization_code",
        code,
        scope: "read write follow push",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", response.status, errorText);
      throw new Error(
        `Token exchange failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error("Token exchange failed: no access token received");
    }

    return data.access_token;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw new Error(
      `Failed to exchange code for token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Validate access token
 */
export async function validateToken(
  instanceUrl: string,
  accessToken: string,
): Promise<boolean> {
  const normalizedUrl = normalizeInstanceUrl(instanceUrl);

  try {
    const client = createRestAPIClient({
      url: normalizedUrl,
      accessToken,
    });

    // Try to verify credentials
    await client.v1.accounts.verifyCredentials();
    return true;
  } catch (error) {
    console.error("Token validation failed:", error);
    return false;
  }
}

/**
 * Complete OAuth login process
 * This orchestrates the entire flow:
 * 1. Register app with instance
 * 2. Start OAuth flow
 * 3. Exchange code for token
 * 4. Save credentials
 * @param forceLogin - If true, forces re-authentication for multi-account support
 */
export async function login(
  instanceUrl: string,
  forceLogin: boolean = false,
): Promise<AuthData> {
  const normalizedUrl = normalizeInstanceUrl(instanceUrl);

  try {
    // Step 1: Register app (or retrieve existing registration)
    console.info("Registering app with", normalizedUrl);
    const appRegistration = await registerApp(normalizedUrl);

    // Step 2: Start OAuth flow with force login option
    console.info("Starting OAuth flow", { forceLogin });
    const authResult = await startOAuthFlow(
      normalizedUrl,
      appRegistration,
      forceLogin,
    );

    console.info("Auth result:", JSON.stringify(authResult, null, 2));

    if (authResult.type !== "success") {
      throw new Error(`OAuth flow was not successful: ${authResult.type}`);
    }

    // Extract authorization code from URL
    let code: string | null = null;

    if (authResult.type === "success" && authResult.url) {
      const url = new URL(authResult.url);
      code = url.searchParams.get("code");
    }

    if (!code) {
      console.error("Auth result details:", {
        type: authResult.type,
        url: authResult.type === "success" ? authResult.url : undefined,
      });
      throw new Error("No authorization code received from OAuth flow");
    }

    // Step 3: Exchange code for token
    console.info("Exchanging code for access token");
    const accessToken = await exchangeCodeForToken(
      normalizedUrl,
      code,
      appRegistration,
    );

    // Step 4: Validate token and fetch account info
    console.info("Validating access token");
    const client = createRestAPIClient({
      url: normalizedUrl,
      accessToken,
    });

    const account = await client.v1.accounts.verifyCredentials();
    if (!account) {
      throw new Error("Token validation failed");
    }

    // Step 5: Create auth data object with account info
    const authData: AuthData = {
      instanceUrl: normalizedUrl,
      accountId: account.id,
      username: account.username,
      clientId: appRegistration.clientId,
      clientSecret: appRegistration.clientSecret,
      accessToken,
      scopes: ["read", "write", "follow", "push"],
    };

    // Step 6: Save to storage
    console.info("Saving auth data to storage");
    await storageService.saveAuthData(normalizedUrl, authData);

    console.info("Login successful");
    return authData;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

/**
 * Logout - clear auth data
 */
export async function logout(instanceUrl: string): Promise<void> {
  try {
    const normalizedUrl = normalizeInstanceUrl(instanceUrl);
    await storageService.deleteAuthData(normalizedUrl);
    console.info("Logout successful");
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

/**
 * Get current user info
 */
export async function getCurrentUser(instanceUrl: string, accessToken: string) {
  const normalizedUrl = normalizeInstanceUrl(instanceUrl);

  try {
    const client = createRestAPIClient({
      url: normalizedUrl,
      accessToken,
    });

    const account = await client.v1.accounts.verifyCredentials();
    return account;
  } catch (error) {
    console.error("Error getting current user:", error);
    throw error;
  }
}
