from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "period_days": 30,
                "total_runs": 145,
                "successful_runs": 130,
                "failed_runs": 10,
                "success_rate": 0.8966,
                "total_tokens_used": 123500,
                "estimated_cost_usd": 0.3705,
                "content_published": 87,
                "content_pending_approval": 12,
                "blocked_injection_attempts": 5,
                "dlp_violations_caught": 2,
            }
        }
    }

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
    model_config = {
        "json_schema_extra": {
            "example": {
                "date": "2025-01-15",
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 4200,
                "estimated_cost_usd": 0.0126,
            }
        }
    }

    date: str  # YYYY-MM-DD
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: float
