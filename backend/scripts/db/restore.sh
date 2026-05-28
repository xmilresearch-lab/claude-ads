#!/bin/bash
# Usage: ./scripts/db/restore.sh /backups/postgres/automation_platform_20250101_020000.sql.gz
# WARNING: This DROPS and recreates the database. Use with caution.

set -euo pipefail

BACKUP_FILE="${1:?Usage: restore.sh <backup_file.sql.gz>}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE" >&2
    exit 1
fi

echo "WARNING: This will DROP and restore the database from:"
echo "   $BACKUP_FILE"
read -rp "Type 'yes' to confirm: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo "[$(date)] Stopping API and workers..."
docker compose -f docker-compose.prod.yml stop api \
  celery_worker_high celery_worker_medium celery_worker_low celery_beat

echo "[$(date)] Restoring from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | \
  docker exec -i automation-platform_postgres_1 \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --single-transaction --quiet

echo "[$(date)] Running migrations to ensure schema is current..."
docker compose -f docker-compose.prod.yml run --rm api \
  alembic upgrade head

echo "[$(date)] Restarting services..."
docker compose -f docker-compose.prod.yml start api \
  celery_worker_high celery_worker_medium celery_worker_low celery_beat

echo "[$(date)] Restore complete."
