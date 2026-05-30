import os
from typing import TypedDict


class McpServerConfig(TypedDict):
    type: str  # always "url" for streamable HTTP transport
    url: str
    name: str
    authorization_token: str


# Keys are all known automation types; values are the server group names to route to.
_ROUTING: dict[str, list[str]] = {
    "social_post": ["social"],
    "email_campaign": ["email"],
    "support_reply": ["email"],
    "crm_update": ["crm"],
    "content_repurpose": ["social", "email"],
}


def _build_server(group: str) -> McpServerConfig:
    """Build a single MCP server config dict by reading env vars at call time."""
    token = os.environ.get("MCP_AUTH_TOKEN", "")
    match group:
        case "social":
            return {
                "type": "url",
                "url": os.environ.get("SOCIAL_MCP_URL", "http://localhost:3001"),
                "name": "social-mcp-server",
                "authorization_token": token,
            }
        case "email":
            return {
                "type": "url",
                "url": os.environ.get("EMAIL_MCP_URL", "http://localhost:3002"),
                "name": "email-mcp-server",
                "authorization_token": token,
            }
        case "crm":
            return {
                "type": "url",
                "url": os.environ.get("CRM_MCP_URL", "http://localhost:3003"),
                "name": "crm-mcp-server",
                "authorization_token": token,
            }
        case _:
            raise ValueError(f"Unknown MCP server group: {group!r}")


def get_mcp_servers_for_automation(automation_type: str) -> list[McpServerConfig]:
    """Return the MCP server configs needed for the given automation type."""
    if automation_type not in _ROUTING:
        raise ValueError(
            f"Unrecognized automation type: {automation_type!r}. "
            f"Valid types: {sorted(_ROUTING)}"
        )
    return [_build_server(group) for group in _ROUTING[automation_type]]


def get_all_mcp_servers() -> list[McpServerConfig]:
    """Return configs for all three MCP servers (used for inspection / health checks)."""
    return [_build_server(g) for g in ("social", "email", "crm")]
