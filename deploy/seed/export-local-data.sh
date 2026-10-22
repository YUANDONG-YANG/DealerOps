#!/usr/bin/env bash
# Exports the data (not the schema) of the local development database into a seed file that
# import-to-azure.sh loads into the Azure MySQL server for demos.
#
# Usage: deploy/seed/export-local-data.sh
# Env:   SEED_DB_NAME, SEED_DB_HOST, SEED_DB_PORT, SEED_DB_USER, SEED_DB_PASSWORD. Each defaults to
#        the connection start-local.sh gives dealer-core: MYSQL_URL in dealer-platform/.env.local
#        when it is an ADO.NET string, otherwise start-local.sh's local default.
#
# The Azure schema is created by dealer-core itself (EnsureCreated plus its column patches), so
# only INSERT statements with explicit column lists are exported. The seed file empties every
# table first, which also replaces the admin account dealer-core seeded on its first start.
set -euo pipefail

seed_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "${seed_dir}/../.." && pwd)"
out="${seed_dir}/dealer_core_seed.sql.gz"

env_file="${repo}/dealer-platform/.env.local"
local_url=""
[ -f "${env_file}" ] && local_url="$(sed -n 's/^MYSQL_URL=//p' "${env_file}" | tail -1 | tr -d '"')"
case "${local_url}" in
  ""|jdbc:*) local_url="$(sed -n 's/^ *MYSQL_URL="\(Server=[^"]*\)".*/\1/p' "${repo}/start-local.sh" | head -1)" ;;
esac
url_field() { printf '%s' "${local_url}" | tr ';' '\n' | sed -n "s/^$1=//Ip" | head -1; }

db="${SEED_DB_NAME:-$(url_field Database)}"
conn=(-h "${SEED_DB_HOST:-$(url_field Server)}" -P "${SEED_DB_PORT:-$(url_field Port)}" -u "${SEED_DB_USER:-$(url_field User)}")
export MYSQL_PWD="${SEED_DB_PASSWORD:-$(url_field Password)}"

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
    --net-buffer-length=1000000 \
    2> >(grep -v 'when trying to dump masking policies' >&2)
  echo "SET UNIQUE_CHECKS=1;"
  echo "SET FOREIGN_KEY_CHECKS=1;"
} | gzip -9 > "${out}"

# mysqldump runs inside the pipe, so its exit status is lost; its end marker proves a full dump.
# mysqldump 9 then reads masking policies, which the app user may not; that error is filtered above.
gunzip -c "${out}" | grep -q '^-- Dump completed' || { echo "mysqldump did not finish; ${out} is incomplete" >&2; exit 1; }

echo "==> row counts"
for t in "${tables[@]}"; do
  printf '  %-22s %s\n' "$t" "$(mysql "${conn[@]}" -N -e "SELECT COUNT(*) FROM \`${db}\`.\`${t}\`")"
done
echo "==> wrote ${out} ($(du -h "${out}" | cut -f1))"
