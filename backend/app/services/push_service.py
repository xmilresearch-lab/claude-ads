"""Web Push notification service using VAPID (RFC 8292) and pywebpush."""
import logging
from typing import Any

logger = logging.getLogger(__name__)

try:
    from pywebpush import WebPushException, webpush

    _WEBPUSH_AVAILABLE = True
except ImportError:  # pragma: no cover
    _WEBPUSH_AVAILABLE = False
    logger.warning("pywebpush not installed — push notifications disabled")


def send_push_notification(
    subscription_info: dict[str, Any],
    message: str,
    vapid_private_key: str,
    vapid_claims: dict[str, str],
) -> bool:
    """Send a Web Push notification to a single subscription.

    Returns True on success, False on delivery failure (expired/gone endpoints
    are treated as a signal to remove the subscription, not a hard error).
    """
    if not _WEBPUSH_AVAILABLE:
        logger.warning("push notification skipped — pywebpush not installed")
        return False

    try:
        webpush(
            subscription_info=subscription_info,
            data=message,
            vapid_private_key=vapid_private_key,
            vapid_claims=vapid_claims,
        )
        return True
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None) if exc.response else None
        if status in (404, 410):
            logger.info("push endpoint gone (status=%s) — subscription should be removed", status)
            return False
        logger.error("WebPushException: %s", exc)
        return False
    except Exception as exc:
        logger.error("push notification failed: %s", exc)
        return False
