from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/automation"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Weaviate
    weaviate_url: str = "http://localhost:8080"

    # Anthropic
    anthropic_api_key: str = ""

    # Encryption
    encryption_key: str = ""

    # Social
    twitter_client_id: str = ""
    twitter_client_secret: str = ""
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    meta_app_id: str = ""
    meta_app_secret: str = ""

    # Email
    google_client_id: str = ""
    google_client_secret: str = ""
    sendgrid_api_key: str = ""
    zendesk_subdomain: str = ""
    zendesk_api_token: str = ""

    # CRM
    hubspot_client_id: str = ""
    hubspot_client_secret: str = ""
    salesforce_client_id: str = ""
    salesforce_client_secret: str = ""

    # MCP Servers
    social_mcp_url: str = "http://localhost:3001"
    social_mcp_token: str = ""
    email_mcp_url: str = "http://localhost:3002"
    email_mcp_token: str = ""
    crm_mcp_url: str = "http://localhost:3003"
    crm_mcp_token: str = ""

    # Rate limits per workspace per day
    rate_limit_social_posts: int = 50
    rate_limit_emails_sent: int = 1000
    rate_limit_ai_calls: int = 500
    rate_limit_crm_updates: int = 2000

    model_config = {"env_file": ".env", "case_sensitive": False}


@lru_cache
def get_settings() -> Settings:
    return Settings()
