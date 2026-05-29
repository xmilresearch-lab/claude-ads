import pytest
from app.services.mcp_registry import (
    McpServerConfig,
    get_all_mcp_servers,
    get_mcp_servers_for_automation,
)

# ── routing correctness ────────────────────────────────────────────────────


def test_social_post_routes_to_social() -> None:
    servers = get_mcp_servers_for_automation("social_post")
    assert len(servers) == 1
    assert servers[0]["name"] == "social-mcp-server"


def test_email_campaign_routes_to_email() -> None:
    servers = get_mcp_servers_for_automation("email_campaign")
    assert len(servers) == 1
    assert servers[0]["name"] == "email-mcp-server"


def test_support_reply_routes_to_email() -> None:
    servers = get_mcp_servers_for_automation("support_reply")
    assert len(servers) == 1
    assert servers[0]["name"] == "email-mcp-server"


def test_crm_update_routes_to_crm() -> None:
    servers = get_mcp_servers_for_automation("crm_update")
    assert len(servers) == 1
    assert servers[0]["name"] == "crm-mcp-server"


def test_content_repurpose_routes_to_social_and_email() -> None:
    servers = get_mcp_servers_for_automation("content_repurpose")
    assert len(servers) == 2
    names = {s["name"] for s in servers}
    assert names == {"social-mcp-server", "email-mcp-server"}


def test_invalid_type_raises_value_error() -> None:
    with pytest.raises(ValueError, match="Unrecognized automation type"):
        get_mcp_servers_for_automation("invalid_type")


def test_error_message_lists_valid_types() -> None:
    with pytest.raises(ValueError, match="social_post"):
        get_mcp_servers_for_automation("nonsense")


# ── config structure ───────────────────────────────────────────────────────


def test_server_config_has_required_keys() -> None:
    servers = get_mcp_servers_for_automation("social_post")
    server = servers[0]
    assert server["type"] == "url"
    assert "url" in server
    assert "name" in server
    assert "authorization_token" in server


@pytest.mark.parametrize(
    "automation_type",
    ["social_post", "email_campaign", "support_reply", "crm_update", "content_repurpose"],
)
def test_all_configs_have_url_type(automation_type: str) -> None:
    for server in get_mcp_servers_for_automation(automation_type):
        assert server["type"] == "url"


# ── env var resolution ─────────────────────────────────────────────────────


def test_social_url_read_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SOCIAL_MCP_URL", "http://custom-social:9001")
    servers = get_mcp_servers_for_automation("social_post")
    assert servers[0]["url"] == "http://custom-social:9001"


def test_email_url_read_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMAIL_MCP_URL", "http://custom-email:9002")
    servers = get_mcp_servers_for_automation("email_campaign")
    assert servers[0]["url"] == "http://custom-email:9002"


def test_crm_url_read_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CRM_MCP_URL", "http://custom-crm:9003")
    servers = get_mcp_servers_for_automation("crm_update")
    assert servers[0]["url"] == "http://custom-crm:9003"


def test_auth_token_applied_to_all_servers(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MCP_AUTH_TOKEN", "super-secret-token")
    for server in get_all_mcp_servers():
        assert server["authorization_token"] == "super-secret-token"


def test_missing_token_gives_empty_string(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MCP_AUTH_TOKEN", raising=False)
    for server in get_all_mcp_servers():
        assert server["authorization_token"] == ""


# ── get_all_mcp_servers ────────────────────────────────────────────────────


def test_get_all_returns_three_servers() -> None:
    servers = get_all_mcp_servers()
    assert len(servers) == 3


def test_get_all_covers_all_three_groups() -> None:
    names = {s["name"] for s in get_all_mcp_servers()}
    assert names == {"social-mcp-server", "email-mcp-server", "crm-mcp-server"}


def test_get_all_configs_are_url_type() -> None:
    for server in get_all_mcp_servers():
        assert server["type"] == "url"
