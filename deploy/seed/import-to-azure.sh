#!/usr/bin/env bash
# Loads deploy/seed/dealer_core_seed.sql.gz into the Azure MySQL server created by Terraform.
# Existing rows in Azure are replaced, so the cloud shows the same demo data (and the same
# sign-ins) as the local development database. Use this only on a blank or reset demo database.
# ./deploy/deploy.sh --seed does not call this script; it loads the committed seed instead.
#
# Usage: deploy/seed/import-to-azure.sh
# Needs: terraform apply done, and dealer-core started once (it creates the tables).
set -euo pipefail

seed_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tf_dir="${seed_dir}/../terraform"
seed="${seed_dir}/dealer_core_seed.sql.gz"
rule="seed-import-$(date +%s)"

for tool in az terraform mysql curl; do
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

echo "==> importing ${seed} into ${host}"
gunzip -c "${seed}" | "${mysql_cmd[@]}"

echo "==> row counts in Azure"
for t in dealer app_user membership vehicle customer customer_vehicle listing vehicle_photo sales_lead work_order audit_event; do
  printf '  %-18s %s\n' "$t" "$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM \`${t}\`")"
done

echo "==> restarting ${core_app} so no cached state predates the import"
az webapp restart -g "${rg}" -n "${core_app}" -o none
echo "==> done. Sign in with the same accounts as the local database."
