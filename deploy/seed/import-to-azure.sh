#!/usr/bin/env bash
# Loads deploy/seed/dealer_core_seed.sql.gz into the Azure MySQL server created by Terraform.
# Existing rows in Azure are replaced, so the cloud shows the same demo data (and the same
# sign-ins, dealership logos and vehicle photos) as the local development database.
# ./deploy/deploy.sh --seed runs export-local-data.sh and then this script.
#
# Before it changes anything, it saves the Azure rows to deploy/seed/azure-backup-*.sql.gz and
# stops if the file has a column the deployed dealer-core has not created. The rows are then
# replaced in one transaction, so a failed import leaves Azure as it was. It also stops if an Azure
# account is missing from the file, unless ALLOW_ACCOUNT_REMOVAL=1 is set.
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
# shellcheck source=deploy/seed/azure-mysql-client.sh
. "${seed_dir}/azure-mysql-client.sh"
[ -f "${seed}" ] || { echo "Missing ${seed}; run deploy/seed/export-local-data.sh first" >&2; exit 1; }

rg="$(terraform -chdir="${tf_dir}" output -raw resource_group_name)"
host="$(terraform -chdir="${tf_dir}" output -raw mysql_fqdn)"
core_app="$(terraform -chdir="${tf_dir}" output -raw core_app_name)"
server="${host%%.*}"
user="$(sed -n 's/^ *mysql_admin_username *= *"\(.*\)".*/\1/p' "${tf_dir}/terraform.tfvars" 2>/dev/null || true)"
if [ -z "${user}" ]; then
  user="$(az mysql flexible-server show -g "${rg}" -n "${server}" --query administratorLogin -o tsv | tr -d '\r')"
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
last_error=""
error_file="$(mktemp)"
for i in $(seq 1 60); do
  if tables="$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='dealer_core'" 2>"${error_file}")"; then
    [ "${tables}" -ge 14 ] && break
  else
    last_error="$(tr -d '\n' <"${error_file}")"
    # A rejected credential or a missing client plugin never becomes true by waiting.
    if azure_mysql_fatal "${last_error}"; then
      echo "Cannot connect to ${host} as ${user} with ${MYSQL_BIN}: ${last_error}" >&2
      echo "This server's admin uses mysql_native_password, which MySQL 9 clients dropped." >&2
      echo "Install a MySQL 8 client or point MYSQL_BIN and MYSQLDUMP_BIN at one." >&2
      rm -f "${error_file}"
      exit 1
    fi
    tables=0
  fi
  curl -fsS -o /dev/null --max-time 30 "${gateway_url}/actuator/health" || true
  sleep 10
done
rm -f "${error_file}"
if [ "${tables}" -lt 14 ]; then
  echo "dealer_core has ${tables} tables after 10 minutes; deploy dealer-core first (deploy/terraform/deploy-apps.sh core)" >&2
  [ -n "${last_error}" ] && echo "Last MySQL error: ${last_error}" >&2
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

# People create accounts on the cloud demo, and the local database does not have them.
echo "==> checking that every Azure account is in the file"
azure_users="$("${mysql_cmd[@]}" -N -e "SELECT username FROM app_user" | LC_ALL=C sort -u)"
lost_users="$(LC_ALL=C comm -23 <(printf '%s\n' "${azure_users}") \
  <(gunzip -c "${seed}" | grep -a '^INSERT INTO `app_user`' | grep -a -oE "\([0-9]+,'[^']+'," \
    | sed -E "s/^\([0-9]+,'(.*)',$/\1/" | LC_ALL=C sort -u))"
if [ -n "${lost_users}" ] && [ "${ALLOW_ACCOUNT_REMOVAL:-}" != "1" ]; then
  echo "These Azure accounts are not in ${seed}, so they could no longer sign in:" >&2
  printf '  %s\n' ${lost_users} >&2
  echo "Nothing was imported. To remove them on purpose, rerun with ALLOW_ACCOUNT_REMOVAL=1." >&2
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

# The 2026-11-03 role patch in dealer-core converts legacy MANAGER/STAFF membership rows to
# OWNER/MANAGER/SALES, but it is one-shot: a marker row in schema_patch stops it running a second
# time. A dump taken before that migration carries legacy role values and no schema_patch row, so
# importing one into an already migrated database would leave values DealerRole cannot parse and
# every member read would return 500, with nothing left to convert them. Clearing the marker makes
# the restart below re-run the migration. This is keyed off the imported data, so a post-migration
# dump - which brings its own schema_patch rows and holds no legacy value - is left alone.
echo "==> checking the imported membership roles against the 2026-11-03 role model"
legacy_roles="$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM membership
  WHERE UPPER(dealer_role) NOT IN ('OWNER','MANAGER','SALES')")"
if [ "${legacy_roles}" -gt 0 ]; then
  echo "    ${legacy_roles} membership rows hold a pre-migration role value, so ${seed} predates"
  echo "    the 2026-11-03 role migration (deploy/ROLE-MIGRATION-2026-11-03.md)"
  patch_table="$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema='dealer_core' AND table_name='schema_patch'")"
  if [ "${patch_table}" -gt 0 ]; then
    "${mysql_cmd[@]}" -e "DELETE FROM schema_patch WHERE patch_id = 'dealer_role_hierarchy_2026_11_03'"
    echo "    cleared the dealer_role_hierarchy_2026_11_03 marker; dealer-core must restart to"
    echo "    re-run the migration, which the restart below does"
  else
    echo "    schema_patch does not exist yet, so dealer-core has the migration still to run"
  fi
  echo "    owners are re-picked by seniority, not restored from the dump: see §5.3 of the runbook"
else
  echo "    every membership row already reads OWNER, MANAGER or SALES"
fi

# AUTH-03: one login, one dealership. TenantMiddleware answers 500 to every /api/v1 call from a
# user bound to two dealerships at once, so the account cannot sign in at all. The seed's natural
# key for a membership is (dealer_id, username), which cannot see a binding in another dealership,
# so a cloud account added to a dealership the local database already binds produces exactly this.
echo "==> checking that no account is active in two dealerships"
double_bound="$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM (SELECT username FROM membership
  WHERE active = 1 GROUP BY username HAVING COUNT(*) > 1) multi")"
if [ "${double_bound}" -gt 0 ]; then
  echo "    ${double_bound} account(s) are active in more than one dealership; each gets HTTP 500" >&2
  echo "    on every /api/v1 call until one membership is unbound:" >&2
  "${mysql_cmd[@]}" -e "SELECT m.username, COUNT(*) AS active_memberships,
    GROUP_CONCAT(CONCAT(d.legal_name, ' [', m.dealer_role, ']') ORDER BY m.dealer_id SEPARATOR ' | ') AS bound_to
    FROM membership m JOIN dealer d ON d.id = m.dealer_id
    WHERE m.active = 1 GROUP BY m.username HAVING COUNT(*) > 1" >&2
  echo "    Unbind the membership the demo does not need:" >&2
  echo "    UPDATE membership SET active = 0 WHERE dealer_id = <id> AND username = '<name>';" >&2
  echo "    A dealership left with active members and no owner needs one appointed too." >&2
else
  echo "    every account is active in at most one dealership"
fi

echo "==> restarting ${core_app} so no cached state predates the import"
az webapp restart -g "${rg}" -n "${core_app}" -o none

# The import counts only once the public site serves it: the gateway must list every active dealership.
expected="$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM dealer WHERE active = 1")"
echo "==> waiting for ${gateway_url} to list ${expected} active dealerships"
served=-1
for i in $(seq 1 30); do
  served="$(curl -fsS --max-time 30 "${gateway_url}/api/v1/catalog/dealers" 2>/dev/null \
    | python3 -I -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null | tr -d '\r' || echo -1)"
  [ "${served}" = "${expected}" ] && break
  sleep 10
done
if [ "${served}" != "${expected}" ]; then
  echo "The gateway lists ${served} dealerships after 5 minutes; Azure MySQL has ${expected} active" >&2
  exit 1
fi
echo "==> done. Sign in with the same accounts as the local database."
echo "    Roll back: SEED_FILE=${backup} deploy/seed/import-to-azure.sh"
