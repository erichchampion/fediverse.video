import { normalizeInstanceUrl } from "./auth";

/**
 * Instance validation and info fetching
 * Phase 2.2: Instance validation
 */

export interface InstanceInfo {
  uri: string;
  title: string;
  description: string;
  version: string;
  registrations: boolean;
  approvalRequired: boolean;
  stats?: {
    userCount: number;
    statusCount: number;
    domainCount: number;
  };
  thumbnail?: string;
  languages?: string[];
}

/**
 * Validate instance URL and check if it's a valid Mastodon instance
 */
export async function validateInstance(instanceUrl: string): Promise<boolean> {
  try {
    const normalizedUrl = normalizeInstanceUrl(instanceUrl);
    const response = await fetch(`${normalizedUrl}/api/v1/instance`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    // Check if response looks like a Mastodon instance
    return !!data.uri && !!data.version;
  } catch (error) {
    console.error("Instance validation error:", error);
    return false;
  }
}

/**
 * Get instance information
 */
export async function getInstanceInfo(
  instanceUrl: string,
): Promise<InstanceInfo | null> {
  try {
    const normalizedUrl = normalizeInstanceUrl(instanceUrl);
    const response = await fetch(`${normalizedUrl}/api/v1/instance`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      uri: data.uri,
      title: data.title,
      description: data.description || data.short_description || "",
      version: data.version,
      registrations: data.registrations ?? true,
      approvalRequired: data.approval_required ?? false,
      stats: data.stats
        ? {
            userCount: data.stats.user_count,
            statusCount: data.stats.status_count,
            domainCount: data.stats.domain_count,
          }
        : undefined,
      thumbnail: data.thumbnail?.url,
      languages: data.languages,
    };
  } catch (error) {
    console.error("Error fetching instance info:", error);
    return null;
  }
}

/**
 * Search for instances (using joinmastodon.org API)
 */
export async function searchInstances(query: string): Promise<InstanceInfo[]> {
  try {
    // For now, just validate the provided URL
    // In the future, we could integrate with joinmastodon.org API
    if (!query.trim()) {
      return [];
    }

    const isValid = await validateInstance(query);
    if (isValid) {
      const info = await getInstanceInfo(query);
      return info ? [info] : [];
    }

    return [];
  } catch (error) {
    console.error("Instance search error:", error);
    return [];
  }
}
