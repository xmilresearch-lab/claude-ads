from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "ai_automation",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.automation_tasks", "app.workers.scheduler_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.automation_tasks.run_automation_task": {"queue": "automations"},
        "app.workers.scheduler_tasks.dispatch_scheduled_automations": {"queue": "scheduler"},
    },
    task_queues={
        "automations": {"exchange": "automations"},
        "scheduler": {"exchange": "scheduler"},
        "celery": {"exchange": "celery"},
    },
    beat_schedule={
        "dispatch-scheduled-automations": {
            "task": "app.workers.scheduler_tasks.dispatch_scheduled_automations",
            "schedule": crontab(minute="*"),  # every minute
        },
    },
)
