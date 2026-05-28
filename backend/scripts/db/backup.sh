#!/bin/bash
# Usage: ./scripts/db/backup.sh
# Backs up the production PostgreSQL database to /backups/
# Intended to run via cron: 0 2 * * * /opt/automation-platform/scripts/db/backup.sh

set -euo pipefail

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="automation_platform_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup: $FILENAME"

# Dump and compress
docker exec automation-platform_postgres_1 \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_DIR/$FILENAME"

echo "[$(date)] Backup complete: $BACKUP_DIR/$FILENAME ($(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1))"

# Verify backup is non-empty
if [ ! -s "$BACKUP_DIR/$FILENAME" ]; then
    echo "ERROR: Backup file is empty!" >&2
    exit 1
fi

# Prune old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date)] Pruned backups older than ${RETENTION_DAYS} days"

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
echo "[$(date)] Total backups retained: $BACKUP_COUNT"
