from typing import Optional

PLAN_LIMITS: dict[str, dict[str, Optional[int]]] = {
    "free": {
        "max_automations": 3,
        "max_integrations": 1,
        "max_content_queues": 10,
        "monthly_ai_tokens": 10_000,
        "max_workspaces": 1,
    },
    "starter": {
        "max_automations": 15,
        "max_integrations": 5,
        "max_content_queues": 100,
        "monthly_ai_tokens": 100_000,
        "max_workspaces": 1,
    },
    "pro": {
        "max_automations": None,
        "max_integrations": None,
        "max_content_queues": None,
        "monthly_ai_tokens": 1_000_000,
        "max_workspaces": 5,
    },
    "enterprise": {
        "max_automations": None,
        "max_integrations": None,
        "max_content_queues": None,
        "monthly_ai_tokens": None,
        "max_workspaces": None,
    },
}
