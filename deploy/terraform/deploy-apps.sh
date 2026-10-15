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

tf() { terraform -chdir="${here}" output -raw "$1"; }

resource_group="$(tf resource_group_name)"
core_app="$(tf core_app_name)"
ai_app="$(tf ai_app_name)"
gateway_app="$(tf gateway_app_name)"
gateway_url="$(tf gateway_public_url)"

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
        echo "==> react frontend: upload dist/ to Static Web Apps"
        npx -y @azure/static-web-apps-cli@2 deploy ./dist \
          --deployment-token "$(tf static_web_app_deployment_token)" \
          --env production
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
