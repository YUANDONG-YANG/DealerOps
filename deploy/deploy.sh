#!/usr/bin/env bash
# One-command cloud deploy: create or update the Azure stack, upload the four apps, then check
# that the gateway answers. Infrastructure stays in Terraform and app code stays in
# deploy-apps.sh, so a single app can still be redeployed alone with terraform/deploy-apps.sh.
#
#   ./deploy.sh              # terraform apply (asks for approval) + all four apps
#   ./deploy.sh core web     # terraform apply + only these apps
#
# Needs the same tools as terraform/deploy-apps.sh plus curl. Procedure: README.md
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tf_dir="${here}/terraform"

command -v curl >/dev/null 2>&1 || { echo "Missing required tool: curl" >&2; exit 1; }

echo "==> terraform init and apply"
terraform -chdir="${tf_dir}" init -input=false
terraform -chdir="${tf_dir}" apply

echo "==> deploy apps"
"${tf_dir}/deploy-apps.sh" "$@"

gateway_url="$(terraform -chdir="${tf_dir}" output -raw gateway_public_url)"
echo "==> wait for ${gateway_url}/actuator/health"
for _ in $(seq 1 30); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "${gateway_url}/actuator/health")" = "200" ]; then
    echo "==> gateway healthy; release times:"
    curl -s "${gateway_url}/actuator/release"
    echo
    exit 0
  fi
  sleep 10
done
echo "Gateway did not report healthy within 5 minutes; check the App Service logs." >&2
exit 1
