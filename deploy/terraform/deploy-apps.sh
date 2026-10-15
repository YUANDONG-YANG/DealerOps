#!/usr/bin/env bash
# Build and upload the four apps to the Azure stack this directory created.
# Run `terraform apply` first: every name and URL below comes from terraform output.
#
#   ./deploy-apps.sh            # all four
#   ./deploy-apps.sh core web   # only these
#
# Needs: az (logged in), terraform, .NET 8 SDK, Node 20 + npm/pnpm.
# Procedure and verification: ../README.md
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "${here}/../.." && pwd)"

for tool in az terraform dotnet npm; do
  command -v "${tool}" >/dev/null 2>&1 || { echo "Missing required tool: ${tool}" >&2; exit 1; }
done

tf() { terraform -chdir="${here}" output -raw "$1" 2>/dev/null || true; }

# `terraform output` is empty when a local state file has not been refreshed yet.
# Evaluate the same Terraform locals as a fallback so a successful build can never
# silently continue with an empty App Service name or API URL.
tf_expr() {
  printf '%s\n' "$1" \
    | terraform -chdir="${here}" console -compact-warnings 2>/dev/null \
    | sed 's/^"//; s/"$//'
}

from_output_or_local() {
  local output local_expr value
  output="$(tf "$1")"
  if [ -n "$output" ] && [ "$output" != "null" ]; then
    printf '%s\n' "$output"
    return
  fi
  local_expr="$2"
  value="$(tf_expr "$local_expr")"
  printf '%s\n' "$value"
}

resource_group="$(from_output_or_local resource_group_name local.resource_group_name)"
core_app="$(from_output_or_local core_app_name local.core_app_name)"
ai_app="$(from_output_or_local ai_app_name local.ai_app_name)"
gateway_app="$(from_output_or_local gateway_app_name local.gateway_app_name)"
web_app="$(from_output_or_local web_app_name local.web_app_name)"
gateway_url="$(from_output_or_local gateway_public_url local.gateway_public_url)"

for deployment_value in resource_group core_app ai_app gateway_app web_app gateway_url; do
  if [ -z "${!deployment_value}" ] || [ "${!deployment_value}" = "null" ]; then
    echo "Could not resolve ${deployment_value} from Terraform outputs or locals." >&2
    exit 1
  fi
done

published_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ "$#" -eq 0 ]; then
  set -- core ai gateway web
fi

deploy_dotnet() {
  local project="$1" app="$2"
  local project_dir="${repo}/backend/dotnet/${project}"

  echo "==> ${project}: stamp PUBLISHED_AT=${published_at}"
  az webapp config appsettings set \
    --resource-group "${resource_group}" --name "${app}" \
    --settings "PUBLISHED_AT=${published_at}" --output none

  echo "==> ${project}: publish"
  dotnet publish "${project_dir}" -c Release -o "${project_dir}/publish" --nologo -v quiet

  echo "==> ${project}: zip and upload to ${app}"
  (cd "${project_dir}/publish" && zip -r -q "${project_dir}/deploy.zip" .)
  az webapp deploy \
    --resource-group "${resource_group}" \
    --name "${app}" \
    --type zip \
    --src-path "${project_dir}/deploy.zip" \
    --async false \
    --output none
  rm -rf "${project_dir}/publish" "${project_dir}/deploy.zip"
}

for target in "$@"; do
  case "${target}" in
    core)
      deploy_dotnet DealerOps.Core "${core_app}"
      ;;
    ai)
      deploy_dotnet DealerOps.AiService "${ai_app}"
      ;;
    gateway)
      deploy_dotnet DealerOps.Gateway "${gateway_app}"
      ;;
    web)
      echo "==> react frontend: build against ${gateway_url}"
      (
        cd "${repo}/frontend/react"
        npm install
        VITE_GATEWAY_URL="${gateway_url}" \
        VITE_PUBLISHED_AT="${published_at}" \
          npm run build
        echo "==> react frontend: zip and upload dist/ to ${web_app}"
        rm -f web.zip
        (cd dist && zip -r -q ../web.zip .)
        az webapp deploy \
          --resource-group "${resource_group}" \
          --name "${web_app}" \
          --type zip \
          --src-path web.zip \
          --async false \
          --output none
        rm -f web.zip
      )
      ;;
    *)
      echo "Unknown target: ${target}. Use core, ai, gateway, or web." >&2
      exit 1
      ;;
  esac
done

echo
echo "Published ${published_at}"
echo "Web     $(tf web_public_url)"
echo "Gateway ${gateway_url}/actuator/health"
echo "Swagger $(tf swagger_url)"
