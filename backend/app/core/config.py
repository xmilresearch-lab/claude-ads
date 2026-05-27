from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/automation_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Claude AI
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"

    # Security
    SECRET_KEY: str = ""
    ENCRYPTION_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # MCP Servers
    SOCIAL_MCP_URL: str = "http://localhost:3001"
    EMAIL_MCP_URL: str = "http://localhost:3002"
    CRM_MCP_URL: str = "http://localhost:3003"
    MCP_AUTH_TOKEN: str = ""

    # Integration OAuth
    TWITTER_CLIENT_ID: str = ""
    TWITTER_CLIENT_SECRET: str = ""
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    HUBSPOT_CLIENT_ID: str = ""
    HUBSPOT_CLIENT_SECRET: str = ""

    @property
    def database_url_sync(self) -> str:
        return self.DATABASE_URL.replace("postgresql+asyncpg", "postgresql+psycopg2")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
