#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${HOME}/Seafile/leonardo-library/Progetti/SatisfactoryLogistics/backups"
DATE_DIR="$(date +%Y%m%d)"
OUT_DIR="${BACKUP_ROOT}/${DATE_DIR}"

if ! npx supabase projects list >/dev/null 2>&1; then
  echo "ERROR: not authenticated with Supabase. Run 'npx supabase login' first." >&2
  exit 1
fi

if [ -e "${OUT_DIR}" ]; then
  echo "ERROR: backup for today already exists at ${OUT_DIR}. Remove it or wait until tomorrow." >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

echo "Backup directory: ${OUT_DIR}"

echo "[1/3] Dumping roles..."
npx supabase db dump -f "${OUT_DIR}/roles.sql" --role-only

echo "[2/3] Dumping schema..."
npx supabase db dump -f "${OUT_DIR}/schema.sql"

echo "[3/3] Dumping data..."
npx supabase db dump \
  -f "${OUT_DIR}/data.sql" \
  --use-copy \
  --data-only \
  -x "storage.buckets_vectors" \
  -x "storage.vector_indexes"

echo "Done. Files written to: ${OUT_DIR}"
ls -lh "${OUT_DIR}"
