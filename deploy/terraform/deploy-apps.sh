#!/usr/bin/env bash
# Build and upload the four apps to the Azure stack this directory created.
# Run `terraform apply` first: every name and URL below comes from terraform output.
#
#   ./deploy-apps.sh            # all four
#   ./deploy-apps.sh core web   # only these
#
# Needs: az (logged in), terraform, JDK 21 + Maven, Node 20 + npm.
# Procedure and verification: ../README.md
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "${here}/../.." && pwd)"

for tool in az terraform mvn npm; do
  command -v "${tool}" >/dev/null 2>&1 || { echo "Missing required tool: ${tool}" >&2; exit 1; }
done

tf() { terraform -chdir="${here}" output -raw "$1"; }

resource_group="$(tf resource_group_name)"
core_app="$(tf core_app_name)"
ai_app="$(tf ai_app_name)"
gateway_app="$(tf gateway_app_name)"
gateway_url="$(tf gateway_public_url)"

# One UTC stamp per run: PUBLISHED_AT on each Java app and VITE_PUBLISHED_AT on the web build.
# The web footer lists all four; Swagger shows dealer-core's (design/20-Observability.md).
published_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ "$#" -eq 0 ]; then
  set -- core ai gateway web
fi

deploy_jar() {
  local module="$1" app="$2"
  echo "==> ${module}: stamp PUBLISHED_AT=${published_at}"
  az webapp config appsettings set \
    --resource-group "${resource_group}" --name "${app}" \
    --settings "PUBLISHED_AT=${published_at}" --output none
  echo "==> ${module}: package"
  (cd "${repo}/${module}" && mvn -B -DskipTests clean package)
  echo "==> ${module}: upload to ${app}"
  az webapp deploy \
    --resource-group "${resource_group}" \
    --name "${app}" \
    --type jar \
    --src-path "$(ls "${repo}/${module}"/target/"${module}"-*.jar | head -1)" \
    --async false \
    --output none
}

for target in "$@"; do
  case "${target}" in
    core)
      deploy_jar dealer-core "${core_app}"
      ;;
    ai)
      # The model key is a Key Vault value, not a build flag.
      deploy_jar ai-service "${ai_app}"
      ;;
    gateway)
      deploy_jar dealer-gateway "${gateway_app}"
      ;;
    web)
      echo "==> dealer-web: build against ${gateway_url}"
      (
        cd "${repo}/dealer-web"
        npm ci
        VITE_GATEWAY_URL="${gateway_url}" \
        VITE_PUBLISHED_AT="${published_at}" \
          npm run build
        echo "==> dealer-web: upload dist/ to Static Web Apps"
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
echo "Release ${gateway_url}/actuator/release"
echo "Swagger $(tf swagger_url)"
