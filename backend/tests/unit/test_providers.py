"""Unit tests for app/integrations/providers.py and Sprint-11 provider helpers.

Covers:
  - PROVIDER_CONFIGS dict structure (imports providers.py → 100% coverage)
  - _generate_pkce_pair        (pure function, no mocks needed)
  - _exchange_facebook_long_lived_token  (mocked httpx)
  - _fetch_facebook_pages                (mocked httpx)
  - _fetch_tiktok_user_info              (mocked httpx)
  - _exchange_oauth_code                 (mocked httpx)
  - _check_provider_health for facebook, instagram, tiktok, threads (mocked httpx)
"""

import base64
import hashlib
from unittest.mock import AsyncMock, MagicMock, patch


# ── PROVIDER_CONFIGS structure validation ─────────────────────────────────────


def test_provider_configs_module_importable() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    assert PROVIDER_CONFIGS is not None
    assert isinstance(PROVIDER_CONFIGS, dict)


def test_all_expected_providers_present() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    expected = {
        "twitter", "linkedin", "gmail", "hubspot",
        "facebook", "instagram", "tiktok", "threads",
    }
    assert expected.issubset(set(PROVIDER_CONFIGS.keys()))


def test_each_provider_has_required_keys() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    required = {"name", "auth_type", "authorization_url", "token_url", "scopes"}
    for provider, cfg in PROVIDER_CONFIGS.items():
        for key in required:
            assert key in cfg, f"Provider '{provider}' missing required key '{key}'"


def test_all_providers_use_oauth_auth_type() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    for provider, cfg in PROVIDER_CONFIGS.items():
        assert cfg["auth_type"] == "oauth", f"Provider '{provider}' has unexpected auth_type"


def test_all_providers_use_authorization_code_grant() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    for provider, cfg in PROVIDER_CONFIGS.items():
        assert cfg["grant_type"] == "authorization_code", (
            f"Provider '{provider}' has unexpected grant_type"
        )


# ── Facebook ──────────────────────────────────────────────────────────────────


def test_facebook_has_page_token_flag() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    assert PROVIDER_CONFIGS["facebook"].get("requires_page_token") is True


def test_facebook_scopes_include_pages_manage_posts_and_pages_show_list() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    scopes = PROVIDER_CONFIGS["facebook"]["scopes"]
    assert "pages_manage_posts" in scopes
    assert "pages_show_list" in scopes


def test_facebook_authorization_url_is_graph_api() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    assert "facebook.com" in PROVIDER_CONFIGS["facebook"]["authorization_url"]


# ── TikTok ────────────────────────────────────────────────────────────────────


def test_tiktok_has_pkce_required_flag() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    assert PROVIDER_CONFIGS["tiktok"].get("pkce_required") is True


def test_tiktok_token_exchange_type_is_tiktok() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    assert PROVIDER_CONFIGS["tiktok"].get("token_exchange") == "tiktok"


def test_tiktok_scopes_include_user_info_and_video_publish() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    scopes = PROVIDER_CONFIGS["tiktok"]["scopes"]
    assert "user.info.basic" in scopes
    assert "video.publish" in scopes


def test_tiktok_access_token_expires_in_24h() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    assert PROVIDER_CONFIGS["tiktok"]["token_expires_in"] == 86400


def test_tiktok_refresh_token_expires_in_1_year() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    assert PROVIDER_CONFIGS["tiktok"]["refresh_expires_in"] == 31536000


# ── Threads ───────────────────────────────────────────────────────────────────


def test_threads_has_long_lived_exchange_flag() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    assert PROVIDER_CONFIGS["threads"].get("long_lived_exchange") is True


def test_threads_long_lived_url_points_to_threads_net() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    long_lived_url = PROVIDER_CONFIGS["threads"].get("long_lived_url", "")
    assert "threads.net" in long_lived_url


def test_threads_scopes_include_basic_and_publish() -> None:
    from app.integrations.providers import PROVIDER_CONFIGS

    scopes = PROVIDER_CONFIGS["threads"]["scopes"]
    assert "threads_basic" in scopes
    assert "threads_content_publish" in scopes


# ── _generate_pkce_pair ───────────────────────────────────────────────────────


def test_pkce_verifier_meets_minimum_length() -> None:
    from app.api.integrations import _generate_pkce_pair

    verifier, _ = _generate_pkce_pair()
    assert len(verifier) >= 43


def test_pkce_verifier_is_url_safe_no_padding() -> None:
    from app.api.integrations import _generate_pkce_pair

    verifier, _ = _generate_pkce_pair()
    assert "+" not in verifier
    assert "/" not in verifier
    assert "=" not in verifier


def test_pkce_challenge_is_s256_hash_of_verifier() -> None:
    from app.api.integrations import _generate_pkce_pair

    verifier, challenge = _generate_pkce_pair()
    expected = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    assert challenge == expected


def test_pkce_pair_is_unique_on_each_call() -> None:
    from app.api.integrations import _generate_pkce_pair

    v1, c1 = _generate_pkce_pair()
    v2, c2 = _generate_pkce_pair()
    assert v1 != v2
    assert c1 != c2


# ── _exchange_facebook_long_lived_token ───────────────────────────────────────


async def test_facebook_long_lived_token_exchange_returns_token_dict() -> None:
    from app.api.integrations import _exchange_facebook_long_lived_token

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "access_token": "EAAlong_lived_tok",
        "token_type": "bearer",
        "expires_in": 5183944,
    }

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        result = await _exchange_facebook_long_lived_token("short_tok")

    assert result["access_token"] == "EAAlong_lived_tok"
    assert result["expires_in"] == 5183944
    call_params = str(mock_client.get.call_args)
    assert "fb_exchange_token" in call_params


async def test_facebook_long_lived_token_exchange_returns_empty_on_json_error() -> None:
    from app.api.integrations import _exchange_facebook_long_lived_token

    mock_response = MagicMock()
    mock_response.json.side_effect = Exception("invalid json")

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        result = await _exchange_facebook_long_lived_token("bad_tok")

    assert result == {}


# ── _fetch_facebook_pages ─────────────────────────────────────────────────────


async def test_fetch_facebook_pages_returns_list_with_ig_account() -> None:
    from app.api.integrations import _fetch_facebook_pages

    pages = [
        {
            "id": "111",
            "name": "My Page",
            "access_token": "page_tok_111",
            "instagram_business_account": {"id": "ig_999"},
        }
    ]
    mock_response = MagicMock()
    mock_response.json.return_value = {"data": pages}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        result = await _fetch_facebook_pages("user_token")

    assert len(result) == 1
    assert result[0]["id"] == "111"
    assert result[0]["instagram_business_account"]["id"] == "ig_999"


async def test_fetch_facebook_pages_returns_empty_on_parse_error() -> None:
    from app.api.integrations import _fetch_facebook_pages

    mock_response = MagicMock()
    mock_response.json.side_effect = Exception("parse error")

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        result = await _fetch_facebook_pages("user_token")

    assert result == []


async def test_fetch_facebook_pages_returns_empty_when_no_data_key() -> None:
    from app.api.integrations import _fetch_facebook_pages

    mock_response = MagicMock()
    mock_response.json.return_value = {}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        result = await _fetch_facebook_pages("user_token")

    assert result == []


# ── _fetch_tiktok_user_info ───────────────────────────────────────────────────


async def test_fetch_tiktok_user_info_returns_display_name() -> None:
    from app.api.integrations import _fetch_tiktok_user_info

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "data": {"user": {"open_id": "tt_abc", "display_name": "Creator XYZ"}}
    }

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        result = await _fetch_tiktok_user_info("tt_tok")

    assert result["display_name"] == "Creator XYZ"
    assert result["open_id"] == "tt_abc"


async def test_fetch_tiktok_user_info_returns_empty_on_parse_error() -> None:
    from app.api.integrations import _fetch_tiktok_user_info

    mock_response = MagicMock()
    mock_response.json.side_effect = Exception("bad json")

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        result = await _fetch_tiktok_user_info("tt_tok")

    assert result == {}


# ── _exchange_oauth_code ──────────────────────────────────────────────────────


async def test_exchange_oauth_code_returns_token_for_known_provider() -> None:
    from app.api.integrations import _exchange_oauth_code

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "access_token": "twit_access_tok",
        "refresh_token": "twit_refresh_tok",
        "token_type": "bearer",
    }

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        result = await _exchange_oauth_code("twitter", "auth_code_xyz", "http://localhost:3000/cb")

    assert result["access_token"] == "twit_access_tok"
    posted = mock_client.post.call_args
    data = posted.kwargs.get("data") or (posted.args[1] if len(posted.args) > 1 else {})
    assert data["code"] == "auth_code_xyz"
    assert data["grant_type"] == "authorization_code"


async def test_exchange_oauth_code_returns_empty_for_unknown_provider() -> None:
    from app.api.integrations import _exchange_oauth_code

    result = await _exchange_oauth_code("nonexistent_provider", "code", "http://cb")
    assert result == {}


async def test_exchange_oauth_code_returns_empty_on_json_decode_error() -> None:
    from app.api.integrations import _exchange_oauth_code

    mock_response = MagicMock()
    mock_response.json.side_effect = Exception("decode error")

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        result = await _exchange_oauth_code("linkedin", "auth_code", "http://cb")

    assert result == {}


# ── _check_provider_health — Facebook ─────────────────────────────────────────


async def test_check_provider_health_facebook_200_when_healthy() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": [{"id": "111", "name": "My Page"}]}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, body = await _check_provider_health(
            "facebook", {"access_token": "fb_tok"}, None
        )

    assert status_code == 200
    assert "data" in body


async def test_check_provider_health_facebook_401_on_expired_token() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.json.return_value = {"error": {"message": "Invalid token"}}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, _ = await _check_provider_health(
            "facebook", {"access_token": "expired_tok"}, None
        )

    assert status_code == 401


async def test_check_provider_health_facebook_empty_body_on_json_error() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.json.side_effect = Exception("bad json")

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, body = await _check_provider_health(
            "facebook", {"access_token": "tok"}, None
        )

    assert status_code == 500
    assert body == {}


# ── _check_provider_health — Instagram ────────────────────────────────────────


async def test_check_provider_health_instagram_503_when_no_ig_user_id() -> None:
    from app.api.integrations import _check_provider_health

    status_code, body = await _check_provider_health(
        "instagram", {"access_token": "tok"}, None
    )
    assert status_code == 503
    assert body == {}


async def test_check_provider_health_instagram_200_with_valid_ig_user_id() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": "17841400000000"}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, body = await _check_provider_health(
            "instagram",
            {"page_access_token": "page_tok", "ig_user_id": "17841400000000"},
            None,
        )

    assert status_code == 200
    assert body["id"] == "17841400000000"


async def test_check_provider_health_instagram_empty_body_on_json_error() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 503
    mock_response.json.side_effect = Exception("parse error")

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, body = await _check_provider_health(
            "instagram",
            {"page_access_token": "page_tok", "ig_user_id": "17841400000000"},
            None,
        )

    assert status_code == 503
    assert body == {}


# ── _check_provider_health — TikTok ──────────────────────────────────────────


async def test_check_provider_health_tiktok_200_when_error_code_is_ok() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": {"user": {"open_id": "tt_id"}},
        "error": {"code": "ok"},
    }

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, _ = await _check_provider_health(
            "tiktok", {"access_token": "tt_tok"}, None
        )

    assert status_code == 200


async def test_check_provider_health_tiktok_401_on_invalid_error_code() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "error": {"code": "access_token.invalid", "message": "Access token is invalid"}
    }

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, _ = await _check_provider_health(
            "tiktok", {"access_token": "bad_tok"}, None
        )

    assert status_code == 401


async def test_check_provider_health_tiktok_empty_body_on_json_error() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.json.side_effect = Exception("parse error")

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, body = await _check_provider_health(
            "tiktok", {"access_token": "tok"}, None
        )

    assert status_code == 500
    assert body == {}


# ── _check_provider_health — Threads ─────────────────────────────────────────


async def test_check_provider_health_threads_200_when_healthy() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": "th_user_123"}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, body = await _check_provider_health(
            "threads", {"access_token": "th_tok"}, None
        )

    assert status_code == 200
    assert body["id"] == "th_user_123"


async def test_check_provider_health_threads_401_on_expired_token() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.json.return_value = {"error": {"message": "Token has expired"}}

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, _ = await _check_provider_health(
            "threads", {"access_token": "expired"}, None
        )

    assert status_code == 401


async def test_check_provider_health_threads_empty_body_on_json_error() -> None:
    from app.api.integrations import _check_provider_health

    mock_response = MagicMock()
    mock_response.status_code = 503
    mock_response.json.side_effect = Exception("no json")

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch("app.api.integrations.httpx.AsyncClient", return_value=mock_client):
        status_code, body = await _check_provider_health(
            "threads", {"access_token": "tok"}, None
        )

    assert status_code == 503
    assert body == {}
