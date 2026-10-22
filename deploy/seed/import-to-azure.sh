#!/usr/bin/env bash
# Loads deploy/seed/dealer_core_seed.sql.gz into the Azure MySQL server created by Terraform.
# Existing rows in Azure are replaced, so the cloud shows the same demo data (and the same
# sign-ins, dealership logos and vehicle photos) as the local development database.
# ./deploy/deploy.sh --seed runs export-local-data.sh and then this script.
#
# Before it changes anything, it saves the Azure rows to deploy/seed/azure-backup-*.sql.gz and
# stops if the file has a column the deployed dealer-core has not created. The rows are then
# replaced in one transaction, so a failed import leaves Azure as it was.
#
# Usage: deploy/seed/import-to-azure.sh
#        SEED_FILE=deploy/seed/azure-backup-<time>.sql.gz deploy/seed/import-to-azure.sh  # roll back
# Needs: terraform apply done, and dealer-core started once (it creates the tables).
set -euo pipefail
# az prints routine notices (no build automation, Kudu warm-up) as warnings; show only errors.
export AZURE_CORE_ONLY_SHOW_ERRORS=true

seed_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tf_dir="${seed_dir}/../terraform"
seed="${SEED_FILE:-${seed_dir}/dealer_core_seed.sql.gz}"
rule="seed-import-$(date +%s)"

for tool in az terraform mysql mysqldump curl python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing required tool: $tool" >&2; exit 1; }
done
[ -f "${seed}" ] || { echo "Missing ${seed}; run deploy/seed/export-local-data.sh first" >&2; exit 1; }

rg="$(terraform -chdir="${tf_dir}" output -raw resource_group_name)"
host="$(terraform -chdir="${tf_dir}" output -raw mysql_fqdn)"
core_app="$(terraform -chdir="${tf_dir}" output -raw core_app_name)"
server="${host%%.*}"
user="$(sed -n 's/^ *mysql_admin_username *= *"\(.*\)".*/\1/p' "${tf_dir}/terraform.tfvars" 2>/dev/null || true)"
if [ -z "${user}" ]; then
  user="$(az mysql flexible-server show -g "${rg}" -n "${server}" --query administratorLogin -o tsv)"
fi
export MYSQL_PWD
MYSQL_PWD="$(terraform -chdir="${tf_dir}" output -raw mysql_admin_password)"
mysql_cmd=(mysql -h "${host}" -u "${user}" --ssl-mode=REQUIRED dealer_core)

ip="$(curl -fsS https://api.ipify.org)"
echo "==> opening MySQL firewall for ${ip} (rule ${rule})"
az mysql flexible-server firewall-rule create -g "${rg}" -n "${server}" --rule-name "${rule}" \
  --start-ip-address "${ip}" --end-ip-address "${ip}" -o none
trap 'echo "==> closing firewall rule ${rule}"; az mysql flexible-server firewall-rule delete -g "${rg}" -n "${server}" --rule-name "${rule}" --yes -o none' EXIT

# dealer-core creates the schema on its first start, about a minute after its upload.
# Core only accepts Azure callers, so it is woken through the gateway's health check. A new
# firewall rule can take a few seconds to apply, so failed connections count as "not yet".
echo "==> waiting for dealer-core to create the schema"
gateway_url="$(terraform -chdir="${tf_dir}" output -raw gateway_public_url)"
tables=0
for i in $(seq 1 60); do
  tables="$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='dealer_core'" 2>/dev/null || echo 0)"
  [ "${tables}" -ge 14 ] && break
  curl -fsS -o /dev/null --max-time 30 "${gateway_url}/actuator/health" || true
  sleep 10
done
if [ "${tables}" -lt 14 ]; then
  echo "dealer_core has ${tables} tables after 10 minutes; deploy dealer-core first (deploy/terraform/deploy-apps.sh core)" >&2
  exit 1
fi

echo "==> checking the file's columns against the Azure schema"
azure_columns="$("${mysql_cmd[@]}" -N -e "SELECT CONCAT(table_name, '.', column_name)
  FROM information_schema.columns WHERE table_schema='dealer_core'" | sort -u)"
missing="$(gunzip -c "${seed}" | grep -o '^INSERT INTO `[a-z_]*` ([^)]*)' | sort -u \
  | sed -E 's/^INSERT INTO `([a-z_]*)` \((.*)\)$/\1 \2/' \
  | while read -r table columns; do tr ',' '\n' <<<"${columns}" | tr -d '` ' | sed "s/^/${table}./"; done \
  | sort -u | comm -23 - <(printf '%s\n' "${azure_columns}"))"
if [ -n "${missing}" ]; then
  echo "Azure has no such columns; deploy the dealer-core that adds them, then sync again:" >&2
  printf '  %s\n' ${missing} >&2
  exit 1
fi

backup="${seed_dir}/azure-backup-$(date +%Y%m%d-%H%M%S).sql.gz"
echo "==> backing up Azure rows to ${backup}"
azure_tables=()
while IFS= read -r t; do azure_tables+=("$t"); done < <("${mysql_cmd[@]}" -N -e "SELECT table_name
  FROM information_schema.tables WHERE table_schema='dealer_core' AND table_type='BASE TABLE' ORDER BY table_name")
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  for t in "${azure_tables[@]}"; do echo "TRUNCATE TABLE \`${t}\`;"; done
  mysqldump -h "${host}" -u "${user}" --ssl-mode=REQUIRED dealer_core "${azure_tables[@]}" \
    --no-create-info --complete-insert --hex-blob --skip-triggers --skip-tz-utc \
    --single-transaction --skip-lock-tables --no-tablespaces --set-gtid-purged=OFF \
    --net-buffer-length=1000000 2> >(grep -v 'when trying to dump masking policies' >&2)
  echo "SET FOREIGN_KEY_CHECKS=1;"
} | gzip -9 > "${backup}"
gunzip -c "${backup}" | grep -q '^-- Dump completed' || { echo "Azure backup is incomplete; nothing was imported" >&2; exit 1; }

# TRUNCATE, LOCK TABLES and ALTER TABLE commit implicitly, so they become DELETE or are dropped;
# the whole replacement is then one transaction that rolls back if any statement fails.
echo "==> importing ${seed} into ${host}"
gunzip -c "${seed}" \
  | sed -E -e 's/^TRUNCATE TABLE (`[a-z_]+`);$/DELETE FROM \1;/' \
           -e '/^(UN)?LOCK TABLES/d' -e '/^\/\*!40000 ALTER TABLE .* (DIS|EN)ABLE KEYS \*\/;$/d' \
  | { echo "SET autocommit=0;"; cat; echo "COMMIT;"; } \
  | "${mysql_cmd[@]}"

echo "==> row counts in Azure"
for t in dealer app_user membership vehicle customer customer_vehicle listing vehicle_photo sales_lead work_order audit_event; do
  printf '  %-18s %s\n' "$t" "$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM \`${t}\`")"
done

echo "==> restarting ${core_app} so no cached state predates the import"
az webapp restart -g "${rg}" -n "${core_app}" -o none

# The import counts only once the public site serves it: the gateway must list every dealership.
expected="$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM dealer")"
echo "==> waiting for ${gateway_url} to list ${expected} dealerships"
served=-1
for i in $(seq 1 30); do
  served="$(curl -fsS --max-time 30 "${gateway_url}/api/v1/catalog/dealers" 2>/dev/null \
    | python3 -I -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo -1)"
  [ "${served}" = "${expected}" ] && break
  sleep 10
done
if [ "${served}" != "${expected}" ]; then
  echo "The gateway lists ${served} dealerships after 5 minutes; Azure MySQL has ${expected}" >&2
  exit 1
fi
echo "==> done. Sign in with the same accounts as the local database."
echo "    Roll back: SEED_FILE=${backup} deploy/seed/import-to-azure.sh"
