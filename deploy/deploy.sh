#!/usr/bin/env bash
# DealerOps deployment entry point.
#
# Examples:
#   ./deploy/deploy.sh                 # publish all apps; Terraform must exist
#   ./deploy/deploy.sh --apply         # apply Terraform, then publish all apps
#   ./deploy/deploy.sh --apply web     # apply Terraform, then publish only React
#   ./deploy/deploy.sh web gateway     # publish selected apps without applying Terraform
#   ./deploy/deploy.sh --apply --seed  # apply, publish all apps, then copy the local database to Azure
#
# Terraform apply is intentionally opt-in because it can create or modify Azure
# resources. The default mode only runs the application upload script.
# --seed is also opt-in. It exports the local development database (every row, dealership logos
# and vehicle photos included) and replaces the Azure rows with it, after backing them up.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
terraform_dir="${script_dir}/terraform"
app_script="${terraform_dir}/deploy-apps.sh"
export_script="${script_dir}/seed/export-local-data.sh"
import_script="${script_dir}/seed/import-to-azure.sh"
apply_terraform=false
seed_data=false
targets=()

usage() {
  sed -n '2,14p' "$0"
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

# Export first, so a stopped or broken local database fails before anything in Azure changes.
if [ "${seed_data}" = true ]; then
  echo "==> exporting the local database"
  "${export_script}"
fi

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
  echo "==> replacing the Azure rows with the local data"
  "${import_script}"
fi
