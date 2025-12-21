/**
 * User/Account type definitions
 * Shared between web and React Native apps
 */

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  header: string;
  followersCount: number;
  followingCount: number;
  statusesCount: number;
  note?: string; // Bio/description
  url?: string; // Profile URL
  acct?: string; // Full account address (e.g., username@instance.com)
  locked?: boolean;
  bot?: boolean;
  discoverable?: boolean;
  group?: boolean;
  createdAt?: string;
  lastStatusAt?: string | null;
  fields?: UserField[];
  emojis?: CustomEmoji[];
}

export interface UserField {
  name: string;
  value: string;
  verifiedAt?: string | null;
}

export interface CustomEmoji {
  shortcode: string;
  url: string;
  staticUrl: string;
  visibleInPicker: boolean;
}

/**
 * Account type (alias for User for compatibility with masto.js)
 */
export type Account = User;
