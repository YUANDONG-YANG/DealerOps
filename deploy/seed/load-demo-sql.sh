#!/usr/bin/env bash
# Loads the committed demo seed (dealer-platform/seed) into the Azure MySQL server
# created by Terraform. Inserts are additive: existing rows are kept, and rows that
# already match a seed natural key are skipped. This script never truncates and never
# passes --reset to load-seed.sh.
#
# Usage: deploy/seed/load-demo-sql.sh
#        deploy/seed/load-demo-sql.sh --check   # local file check only; no Azure, no MySQL
# Needs: terraform apply done, and dealer-core started once (it creates the tables).
set -euo pipefail

seed_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "${seed_dir}/../.." && pwd)"
tf_dir="${seed_dir}/../terraform"
load_script="${repo}/dealer-platform/seed/scripts/load-seed.sh"
sql_dir="${repo}/dealer-platform/seed/sql"

required_tables=(
  dealer app_user membership vehicle customer customer_vehicle
  listing compliance_check sales_lead sales_lead_note work_order
  vehicle_photo audit_event notification
)

check_seed_files() {
  [ -f "${load_script}" ] || { echo "Missing ${load_script}" >&2; exit 1; }
  local name
  for name in 01_dealers_users.sql 02_vehicles.sql 03_customers_links.sql 04_listings.sql \
              05_leads.sql 06_work_orders.sql 07_join_requests.sql 08_audit.sql; do
    [ -f "${sql_dir}/${name}" ] || { echo "Missing ${sql_dir}/${name}" >&2; exit 1; }
  done
}

if [ "${1:-}" = "--check" ]; then
  check_seed_files
  echo "Demo seed files are present."
  echo "A real run loads dealer-platform/seed through dealer-platform/seed/scripts/load-seed.sh with no --reset."
  echo "It does not call Azure, does not truncate, and does not replace existing rows."
  exit 0
fi
if [ "$#" -gt 0 ]; then
  echo "Unknown argument: $1" >&2
  echo "Usage: deploy/seed/load-demo-sql.sh [--check]" >&2
  exit 2
fi

check_seed_files

for tool in az terraform mysql python3 curl; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing required tool: $tool" >&2; exit 1; }
done

rule="demo-seed-$(date +%s)"
rg="$(terraform -chdir="${tf_dir}" output -raw resource_group_name)"
host="$(terraform -chdir="${tf_dir}" output -raw mysql_fqdn)"
server="${host%%.*}"
user="$(sed -n 's/^ *mysql_admin_username *= *"\(.*\)".*/\1/p' "${tf_dir}/terraform.tfvars" 2>/dev/null || true)"
if [ -z "${user}" ]; then
  user="$(az mysql flexible-server show -g "${rg}" -n "${server}" --query administratorLogin -o tsv)"
fi
export MYSQL_PWD
MYSQL_PWD="$(terraform -chdir="${tf_dir}" output -raw mysql_admin_password)"
export MYSQL_HOST="${host}"
export MYSQL_PORT=3306
export MYSQL_DB=dealer_core
export MYSQL_USER="${user}"
export MYSQL_SSL_MODE=REQUIRED
mysql_cmd=(mysql --default-character-set=utf8mb4 -h "${host}" -u "${user}" --ssl-mode=REQUIRED dealer_core)

ip="$(curl -fsS https://api.ipify.org)"
echo "==> opening MySQL firewall for ${ip} (rule ${rule})"
az mysql flexible-server firewall-rule create -g "${rg}" -n "${server}" --rule-name "${rule}" \
  --start-ip-address "${ip}" --end-ip-address "${ip}" -o none
trap 'echo "==> closing firewall rule ${rule}"; az mysql flexible-server firewall-rule delete -g "${rg}" -n "${server}" --rule-name "${rule}" --yes -o none' EXIT

# dealer-core creates the schema on its first start. Core only accepts Azure callers, so it is
# woken through the gateway health check. A new firewall rule can take a few seconds to apply.
echo "==> waiting for dealer-core to create the schema"
gateway_url="$(terraform -chdir="${tf_dir}" output -raw gateway_public_url)"
in_list="$(printf "'%s'," "${required_tables[@]}")"
in_list="${in_list%,}"
needed="${#required_tables[@]}"
tables=0
attempt=0
while [ "${attempt}" -lt 60 ]; do
  attempt=$((attempt + 1))
  tables="$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='dealer_core' AND table_name IN (${in_list})" 2>/dev/null || echo 0)"
  [ "${tables}" -ge "${needed}" ] && break
  curl -fsS -o /dev/null --max-time 30 "${gateway_url}/actuator/health" || true
  sleep 10
done
if [ "${tables}" -lt "${needed}" ]; then
  echo "dealer_core is missing demo tables (${tables}/${needed}); deploy dealer-core first (deploy/terraform/deploy-apps.sh core)" >&2
  exit 1
fi

dealers="$("${mysql_cmd[@]}" -N -e "SELECT COUNT(*) FROM dealer")"
echo "==> ${dealers} dealership rows already present; they are kept (no truncate, no --reset)"
echo "==> loading committed demo seed from dealer-platform/seed"
"${load_script}"

# Business rows are read from MySQL on each request. The only in-memory cache is the
# external VIN catalog, so the apps deploy-apps.sh already found healthy stay up.
web_url="$(terraform -chdir="${tf_dir}" output -raw web_public_url)"
admin_user="$(terraform -chdir="${tf_dir}" output -raw admin_username)"
echo "==> done. Web ${web_url}"
echo "    Platform admin: ${admin_user}"
echo "    Password: terraform -chdir=deploy/terraform output -raw admin_password"
echo "    Dealer staff usernames: dealer-platform/seed/contract/dealers.json"
echo "    Their shared password is not stored in this repository (dealer-platform/seed/README.md)."
echo "    ${admin_user} opens /admin. Vehicles, customers, and ads need a dealer staff sign-in."
