from celery.schedules import crontab

BEAT_SCHEDULE: dict = {
    "check-expiring-credentials": {
        "task": "app.workers.credential_worker.check_and_refresh_credentials",
        "schedule": crontab(hour="*/6"),
        "options": {"queue": "low_priority"},
    },
}
