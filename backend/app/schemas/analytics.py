from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    period_days: int
    total_runs: int
    successful_runs: int
    failed_runs: int
    success_rate: float  # 0.0–1.0
    total_tokens_used: int
    estimated_cost_usd: float  # tokens * $0.000003 (Sonnet input rate)
    content_published: int
    content_pending_approval: int
    blocked_injection_attempts: int
    dlp_violations_caught: int


class AutomationBreakdown(BaseModel):
    automation_id: str
    automation_name: str
    type: str
    runs_total: int
    runs_successful: int
    runs_failed: int
    avg_tokens_per_run: float
    last_run_at: str | None


class PlatformStats(BaseModel):
    platform: str
    content_published: int
    content_pending: int
    content_rejected: int


class TokenUsageSeries(BaseModel):
    date: str  # YYYY-MM-DD
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: float
