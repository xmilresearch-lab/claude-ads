from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "automation",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.workers.tasks.handle_support_ticket": {"queue": "high_priority"},
        "app.workers.tasks.run_email_campaign": {"queue": "medium_priority"},
        "app.workers.tasks.run_crm_update": {"queue": "medium_priority"},
        "app.workers.tasks.run_automation": {"queue": "medium_priority"},
        "app.workers.tasks.scheduled_social_post": {"queue": "low_priority"},
        "app.workers.tasks.process_content_repurposing": {"queue": "low_priority"},
    },
    beat_schedule={
        # Placeholder — schedules are dynamically registered per automation config
    },
)
