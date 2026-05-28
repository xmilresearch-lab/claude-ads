// Hand-written types matching the backend OpenAPI schema.
// Regenerate with: npm run gen-types

export interface Meta {
  request_id: string;
  timestamp: string;
  version?: string;
}

export interface PaginationMeta extends Meta {
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  plan: string;
  is_active: boolean;
  created_at: string;
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export interface BrandVoice {
  tone?: string;
  examples?: string[];
  avoid?: string[];
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  brand_voice: BrandVoice | null;
  settings: Record<string, unknown>;
  created_at: string;
}

// ── Automations ───────────────────────────────────────────────────────────────

export type AutomationType =
  | "social_post"
  | "email_campaign"
  | "support_reply"
  | "crm_update"
  | "scheduled";

export type AutomationStatus = "active" | "paused" | "error";

export interface AutomationResponse {
  id: string;
  workspace_id: string;
  name: string;
  type: AutomationType;
  config: Record<string, unknown>;
  schedule: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type RunStatus = "pending" | "running" | "success" | "failed" | "blocked";

export interface AutomationRunResponse {
  id: string;
  automation_id: string;
  status: RunStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  ai_tokens_used: number | null;
  started_at: string;
  finished_at: string | null;
}

// ── Content Queue ─────────────────────────────────────────────────────────────

export type ContentStatus = "pending_approval" | "approved" | "rejected" | "published" | "failed";

export interface ContentQueueItem {
  id: string;
  automation_id: string;
  content: Record<string, unknown>;
  platform: string;
  status: ContentStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
}

// ── Integrations ──────────────────────────────────────────────────────────────

export type IntegrationType =
  | "twitter"
  | "linkedin"
  | "instagram"
  | "gmail"
  | "sendgrid"
  | "zendesk"
  | "hubspot"
  | "salesforce";

export type IntegrationStatus = "active" | "inactive" | "error" | "expired";

export interface IntegrationResponse {
  id: string;
  workspace_id: string;
  type: IntegrationType;
  status: IntegrationStatus;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  total_tokens: number;
  active_automations: number;
  pending_content: number;
}

export interface TokenUsageSeries {
  day: string;
  total_tokens: number;
}

export interface PlatformStats {
  platform: string;
  status: string;
  count: number;
}

export interface AutomationBreakdown {
  automation_id: string;
  automation_name: string;
  runs_total: number;
  runs_success: number;
  runs_failed: number;
  avg_tokens: number;
  last_run_at: string | null;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditLogResponse {
  id: string;
  workspace_id: string;
  action: string;
  actor: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
