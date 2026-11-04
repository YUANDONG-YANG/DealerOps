#!/usr/bin/env bash
# Saves the cloud data into the seed. Run it before every terraform destroy; if it fails, do not destroy.
#
# It takes an incremental backup of Azure MySQL, then writes the rows created on the cloud to
# dealer-platform/seed/sql/09_cloud_additions.sql, skipping rows the target database already has.
# The next ./deploy/deploy.sh --apply --seed publishes them. Pass --allow-removal if accounts saved
# earlier were removed from Azure on purpose.
set -euo pipefail

seed_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "${seed_dir}/../.." && pwd)"

"${seed_dir}/backup-azure-incremental.sh"

shopt -s nullglob
backups=("${seed_dir}"/backups/azure-incr-*.sql.gz)
[ "${#backups[@]}" -gt 0 ] || { echo "No Azure backup found in ${seed_dir}/backups" >&2; exit 1; }

joined="$(mktemp)"
trap 'rm -f "${joined}"' EXIT
cat "${backups[@]}" > "${joined}"
python3 -I "${repo}/dealer-platform/seed/scripts/gen_cloud_additions.py" "${joined}" "$@"
