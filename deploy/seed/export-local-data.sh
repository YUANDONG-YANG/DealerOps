#!/usr/bin/env bash
# Exports the data (not the schema) of the local development database into a seed file that
# import-to-azure.sh loads into the Azure MySQL server for demos.
#
# Usage: deploy/seed/export-local-data.sh
# Env:   SEED_DB_NAME (default dealer_core), SEED_DB_HOST (127.0.0.1), SEED_DB_PORT (3306),
#        SEED_DB_USER (root), SEED_DB_PASSWORD (empty)
#
# The Azure schema is created by dealer-core itself (EnsureCreated plus its column patches), so
# only INSERT statements with explicit column lists are exported. The seed file empties every
# table first, which also replaces the admin account dealer-core seeded on its first start.
set -euo pipefail

seed_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="${seed_dir}/dealer_core_seed.sql.gz"
db="${SEED_DB_NAME:-dealer_core}"
conn=(-h "${SEED_DB_HOST:-127.0.0.1}" -P "${SEED_DB_PORT:-3306}" -u "${SEED_DB_USER:-root}")
[ -n "${SEED_DB_PASSWORD:-}" ] && conn+=("-p${SEED_DB_PASSWORD}")

command -v mysqldump >/dev/null 2>&1 || { echo "Missing required tool: mysqldump" >&2; exit 1; }

# flyway_schema_history belongs to the retired Java stack and is not part of the .NET schema.
tables=()
while IFS= read -r t; do tables+=("$t"); done < <(
  mysql "${conn[@]}" -N -e "SELECT table_name FROM information_schema.tables
    WHERE table_schema='${db}' AND table_type='BASE TABLE' AND table_name <> 'flyway_schema_history'
    ORDER BY table_name")
[ "${#tables[@]}" -gt 0 ] || { echo "No tables found in ${db}" >&2; exit 1; }

echo "==> exporting ${#tables[@]} tables from ${db}"
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  echo "SET UNIQUE_CHECKS=0;"
  for t in "${tables[@]}"; do echo "TRUNCATE TABLE \`${t}\`;"; done
  # --skip-tz-utc keeps timestamps exactly as dealer-core wrote them (UTC values); the default
  # would shift them by the local server's offset on the way into Azure's DATETIME columns.
  mysqldump "${conn[@]}" "${db}" "${tables[@]}" \
    --no-create-info --complete-insert --hex-blob --skip-triggers --skip-tz-utc \
    --single-transaction --skip-lock-tables --no-tablespaces --set-gtid-purged=OFF \
    --net-buffer-length=1000000
  echo "SET UNIQUE_CHECKS=1;"
  echo "SET FOREIGN_KEY_CHECKS=1;"
} | gzip -9 > "${out}"

echo "==> row counts"
for t in "${tables[@]}"; do
  printf '  %-22s %s\n' "$t" "$(mysql "${conn[@]}" -N -e "SELECT COUNT(*) FROM \`${db}\`.\`${t}\`")"
done
echo "==> wrote ${out} ($(du -h "${out}" | cut -f1))"
