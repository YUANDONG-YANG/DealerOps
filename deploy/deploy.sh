#!/usr/bin/env bash
# DealerOps deployment entry point.
#
# Examples:
#   ./deploy/deploy.sh                 # publish all apps; Terraform must exist
#   ./deploy/deploy.sh --apply         # apply Terraform, then publish all apps
#   ./deploy/deploy.sh --apply web     # apply Terraform, then publish only React
#   ./deploy/deploy.sh web gateway     # publish selected apps without applying Terraform
#   ./deploy/deploy.sh --apply --seed  # apply, publish all apps, then load the committed demo seed
#
# Terraform apply is intentionally opt-in because it can create or modify Azure
# resources. The default mode only runs the application upload script.
# --seed is also opt-in. It loads dealer-platform/seed and does not replace existing rows.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
terraform_dir="${script_dir}/terraform"
app_script="${terraform_dir}/deploy-apps.sh"
seed_script="${script_dir}/seed/load-demo-sql.sh"
apply_terraform=false
seed_data=false
targets=()

usage() {
  sed -n '2,13p' "$0"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --apply)
      apply_terraform=true
      shift
      ;;
    --seed)
      seed_data=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    core|ai|gateway|web)
      targets+=("$1")
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

command -v terraform >/dev/null 2>&1 || { echo "Missing required tool: terraform" >&2; exit 1; }

if [ "${apply_terraform}" = true ]; then
  echo "==> applying Terraform infrastructure"
  terraform -chdir="${terraform_dir}" init
  terraform -chdir="${terraform_dir}" apply -auto-approve
fi

if [ "${#targets[@]}" -eq 0 ]; then
  "${app_script}"
else
  "${app_script}" "${targets[@]}"
fi

if [ "${seed_data}" = true ]; then
  echo "==> loading committed demo seed (dealer-platform/seed; existing rows are kept)"
  "${seed_script}"
fi
