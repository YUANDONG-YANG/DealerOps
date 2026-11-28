#!/usr/bin/env bash
# Saves the Azure MySQL rows that changed since the last run to
# deploy/seed/backups/azure-incr-<time>.sql.gz. deploy/seed/save-cloud-to-seed.sh runs it before a
# terraform destroy.
#
# Not every table has updated_at, and a timestamp cannot show a deleted row, so each run compares an
# MD5 of every row with the hashes kept in deploy/seed/backups/manifest. The first run has no hashes,
# so its file holds every row. MySQL computes the hashes, so photos are downloaded only when they change.
#
# To restore, join the files in order and import the result (it can stop at any earlier file):
#   cat deploy/seed/backups/azure-incr-*.sql.gz > deploy/seed/restore.sql.gz
#   SEED_FILE=deploy/seed/restore.sql.gz deploy/seed/import-to-azure.sh
#
# The files stay out of git because the first one can reach GitHub's 100 MB file limit.
set -euo pipefail
# az prints routine notices as warnings; show only errors.
export AZURE_CORE_ONLY_SHOW_ERRORS=true

seed_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tf_dir="${seed_dir}/../terraform"
backup_dir="${seed_dir}/backups"
manifest_dir="${backup_dir}/manifest"
rule="incr-backup-$(date +%s)"
# Windows' command line is limited to about 32 KB, so large id lists are split.
batch_size=500

for tool in az terraform mysql mysqldump curl; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing required tool: $tool" >&2; exit 1; }
done
# shellcheck source=deploy/seed/azure-mysql-client.sh
. "${seed_dir}/azure-mysql-client.sh"

if ! host="$(terraform -chdir="${tf_dir}" output -raw mysql_fqdn 2>/dev/null)"; then
  echo "==> no Azure database yet; nothing to back up"
  exit 0
fi
rg="$(terraform -chdir="${tf_dir}" output -raw resource_group_name)"
server="${host%%.*}"
user="$(sed -n 's/^ *mysql_admin_username *= *"\(.*\)".*/\1/p' "${tf_dir}/terraform.tfvars" 2>/dev/null || true)"
if [ -z "${user}" ]; then
  user="$(az mysql flexible-server show -g "${rg}" -n "${server}" --query administratorLogin -o tsv | tr -d '\r')"
fi
export MYSQL_PWD
MYSQL_PWD="$(terraform -chdir="${tf_dir}" output -raw mysql_admin_password)"
mysql_cmd=(mysql -h "${host}" -u "${user}" --ssl-mode=REQUIRED dealer_core)

work="$(mktemp -d)"
close_firewall=false
cleanup() {
  rm -rf "${work}"
  if [ "${close_firewall}" = true ]; then
    echo "==> closing firewall rule ${rule}"
    az mysql flexible-server firewall-rule delete -g "${rg}" -n "${server}" --rule-name "${rule}" --yes -o none
  fi
}
trap cleanup EXIT

ip="$(curl -fsS https://api.ipify.org)"
echo "==> opening MySQL firewall for ${ip} (rule ${rule})"
az mysql flexible-server firewall-rule create -g "${rg}" -n "${server}" --rule-name "${rule}" \
  --start-ip-address "${ip}" --end-ip-address "${ip}" -o none
close_firewall=true

# A new firewall rule can take a few seconds to apply.
for i in $(seq 1 12); do
  "${mysql_cmd[@]}" -N -e "SELECT 1" >/dev/null 2>&1 && break
  sleep 10
done

# Prints the ids in the file $1 as quoted lists of at most batch_size, one list per line.
id_batches() {
  awk -v size="${batch_size}" '{ printf "%s\047%s\047", (NR % size == 1 ? (NR > 1 ? "\n" : "") : ","), $0 } END { if (NR) print "" }' "$1"
}

changes="${work}/changes.sql"
echo "SET FOREIGN_KEY_CHECKS=0;" > "${changes}"
changed=false

tables="$("${mysql_cmd[@]}" -N -e "SELECT table_name FROM information_schema.tables
  WHERE table_schema='dealer_core' AND table_type='BASE TABLE' ORDER BY table_name")"
for t in ${tables}; do
  pk="$("${mysql_cmd[@]}" -N -e "SELECT column_name FROM information_schema.key_column_usage
    WHERE table_schema='dealer_core' AND table_name='${t}' AND constraint_name='PRIMARY'")"
  # Each column is hashed on its own: CONCAT over several photos can exceed max_allowed_packet.
  columns="$("${mysql_cmd[@]}" -N -e "SET SESSION group_concat_max_len=65535;
    SELECT GROUP_CONCAT(CONCAT('COALESCE(MD5(\`', column_name, '\`),''-'')') ORDER BY ordinal_position)
    FROM information_schema.columns WHERE table_schema='dealer_core' AND table_name='${t}'")"
  "${mysql_cmd[@]}" -N -e "SELECT \`${pk}\`, MD5(CONCAT_WS('|', ${columns})) FROM \`${t}\`" \
    | LC_ALL=C sort > "${work}/${t}.hashes"

  old="${manifest_dir}/${t}.hashes"
  if [ ! -f "${old}" ]; then
    # First sight of this table: the restored table must hold only what these files say.
    echo "TRUNCATE TABLE \`${t}\`;" >> "${changes}"
    changed=true
    old=/dev/null
  fi
  LC_ALL=C comm -23 "${old}" "${work}/${t}.hashes" | cut -f1 > "${work}/${t}.delete"
  LC_ALL=C comm -13 "${old}" "${work}/${t}.hashes" | cut -f1 > "${work}/${t}.insert"
  if [ -s "${work}/${t}.delete" ] || [ -s "${work}/${t}.insert" ]; then
    changed=true
    echo "    ${t}: $(wc -l < "${work}/${t}.insert" | tr -d ' ') new or changed, $(wc -l < "${work}/${t}.delete" | tr -d ' ') replaced or removed"
  fi

  # All deletes go first, so a row that took over a unique value from another row can be inserted.
  while IFS= read -r ids; do
    echo "DELETE FROM \`${t}\` WHERE \`${pk}\` IN (${ids});" >> "${changes}"
  done < <(id_batches "${work}/${t}.delete")
  while IFS= read -r ids; do
    mysqldump -h "${host}" -u "${user}" --ssl-mode=REQUIRED dealer_core "${t}" --where="\`${pk}\` IN (${ids})" \
      --no-create-info --complete-insert --hex-blob --skip-triggers --skip-tz-utc \
      --single-transaction --skip-lock-tables --no-tablespaces --set-gtid-purged=OFF \
      --net-buffer-length=1000000 2> >(grep -v 'when trying to dump masking policies' >&2) >> "${changes}" </dev/null
  done < <(id_batches "${work}/${t}.insert")
done
echo "SET FOREIGN_KEY_CHECKS=1;" >> "${changes}"

if [ "${changed}" = false ]; then
  echo "==> no rows changed since the last backup"
  exit 0
fi

# The hashes move only after the file is complete, so a failed run is simply repeated by the next one.
mkdir -p "${manifest_dir}"
backup="${backup_dir}/azure-incr-$(date +%Y%m%d-%H%M%S).sql.gz"
gzip -9 < "${changes}" > "${work}/backup.sql.gz"
gzip -t "${work}/backup.sql.gz"
mv "${work}/backup.sql.gz" "${backup}"
for t in ${tables}; do cp "${work}/${t}.hashes" "${manifest_dir}/${t}.hashes"; done
echo "==> saved ${backup}"
