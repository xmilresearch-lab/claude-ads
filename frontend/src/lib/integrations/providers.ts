export type AuthType = "oauth" | "api_key";
export type ProviderCategory = "social" | "email" | "support" | "crm";

export interface ProviderConfig {
  id: string;
  name: string;
  category: ProviderCategory;
  authType: AuthType;
  color: string;
  lettermark: string;
  description: string;
  scopes?: string[];
  extraFields?: {
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
  }[];
  comingSoon?: boolean;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  gmail: {
    id: "gmail",
    name: "Gmail",
    category: "email",
    authType: "oauth",
    color: "#EA4335",
    lettermark: "Gm",
    description: "Send email campaigns and manage threads",
    scopes: ["gmail.send", "gmail.readonly", "gmail.modify"],
  },
  twitter: {
    id: "twitter",
    name: "X / Twitter",
    category: "social",
    authType: "oauth",
    color: "#000000",
    lettermark: "X",
    description: "Schedule and publish posts, read analytics",
    scopes: ["tweet.read", "tweet.write", "users.read"],
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    category: "social",
    authType: "oauth",
    color: "#0A66C2",
    lettermark: "in",
    description: "Post updates and articles to your company page",
    scopes: ["w_member_social", "r_organization_social"],
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    category: "social",
    authType: "oauth",
    color: "#E1306C",
    lettermark: "IG",
    description: "Schedule posts and reels via Meta Graph API",
    scopes: ["instagram_basic", "instagram_content_publish"],
    comingSoon: true,
  },
  sendgrid: {
    id: "sendgrid",
    name: "SendGrid",
    category: "email",
    authType: "api_key",
    color: "#1A82E2",
    lettermark: "SG",
    description: "Transactional and marketing email delivery",
  },
  zendesk: {
    id: "zendesk",
    name: "Zendesk",
    category: "support",
    authType: "api_key",
    color: "#03363D",
    lettermark: "Zd",
    description: "Auto-reply and manage support tickets",
    extraFields: [
      {
        key: "subdomain",
        label: "Zendesk Subdomain",
        placeholder: "mycompany (from mycompany.zendesk.com)",
        required: true,
      },
    ],
  },
  hubspot: {
    id: "hubspot",
    name: "HubSpot",
    category: "crm",
    authType: "oauth",
    color: "#FF7A59",
    lettermark: "HS",
    description: "Sync contacts, deals, and log CRM activity",
    scopes: [
      "crm.objects.contacts.read",
      "crm.objects.deals.read",
      "crm.objects.contacts.write",
    ],
  },
};

export function getProvidersByCategory(category: ProviderCategory): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter((p) => p.category === category);
}

export const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  social: "Social Media",
  email: "Email",
  support: "Customer Support",
  crm: "CRM",
};

export const CATEGORY_ORDER: ProviderCategory[] = ["social", "email", "support", "crm"];
