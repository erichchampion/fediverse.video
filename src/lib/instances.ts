/**
 * Popular Mastodon instances with metadata
 * Phase 2.1: Instance selector data
 */

export interface PopularInstance {
  domain: string;
  name: string;
  description: string;
  category: "general" | "tech" | "art" | "gaming" | "regional" | "special";
  userCount?: string;
  languages?: string[];
  openRegistrations: boolean;
}

export const POPULAR_INSTANCES: PopularInstance[] = [
  // General purpose
  {
    domain: "mastodon.social",
    name: "Mastodon Social",
    description: "The original Mastodon instance",
    category: "general",
    userCount: "1M+",
    languages: ["en"],
    openRegistrations: true,
  },
  {
    domain: "mstdn.social",
    name: "mstdn.social",
    description: "General purpose instance",
    category: "general",
    languages: ["en"],
    openRegistrations: true,
  },
  {
    domain: "fosstodon.org",
    name: "Fosstodon",
    description: "For Free and Open Source Software enthusiasts",
    category: "tech",
    userCount: "50K+",
    languages: ["en"],
    openRegistrations: true,
  },

  // Tech focused
  {
    domain: "hachyderm.io",
    name: "Hachyderm",
    description: "Safe space for tech professionals",
    category: "tech",
    userCount: "30K+",
    languages: ["en"],
    openRegistrations: true,
  },
  {
    domain: "infosec.exchange",
    name: "Infosec Exchange",
    description: "InfoSec community",
    category: "tech",
    userCount: "20K+",
    languages: ["en"],
    openRegistrations: true,
  },

  // Art focused
  {
    domain: "mastodon.art",
    name: "Mastodon Art",
    description: "For artists and art lovers",
    category: "art",
    userCount: "40K+",
    languages: ["en"],
    openRegistrations: true,
  },
  {
    domain: "pixelfed.art",
    name: "Pixelfed Art",
    description: "Federated image sharing for photographers and visual artists",
    category: "art",
    languages: ["en"],
    openRegistrations: true,
  },

  // Gaming
  {
    domain: "mstdn.games",
    name: "Mastodon Games",
    description: "For gamers and game developers",
    category: "gaming",
    languages: ["en"],
    openRegistrations: true,
  },

  // Regional
  {
    domain: "mas.to",
    name: "mas.to",
    description: "General purpose with focus on UK/Europe",
    category: "regional",
    userCount: "100K+",
    languages: ["en"],
    openRegistrations: true,
  },
  {
    domain: "mastodon.online",
    name: "Mastodon Online",
    description: "Fast and reliable instance",
    category: "general",
    languages: ["en"],
    openRegistrations: true,
  },
  {
    domain: "universeodon.com",
    name: "Universeodon",
    description: "Science, nature, and space enthusiasts",
    category: "special",
    userCount: "30K+",
    languages: ["en"],
    openRegistrations: true,
  },
];

export const INSTANCE_CATEGORIES = [
  { key: "general", label: "General", icon: "🌐" },
  { key: "tech", label: "Technology", icon: "💻" },
  { key: "art", label: "Art & Creative", icon: "🎨" },
  { key: "gaming", label: "Gaming", icon: "🎮" },
  { key: "regional", label: "Regional", icon: "📍" },
  { key: "special", label: "Special Interest", icon: "⭐" },
] as const;
