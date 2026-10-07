#!/usr/bin/env bash
# Fetches the Apache SkyWalking Java agent (matches the OAP/UI version pinned in
# docker-compose.yml) into deploy/skywalking/agent/. That directory is gitignored;
# every developer runs this once. See design/20-Observability.md.
set -euo pipefail

VERSION="9.7.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="${SCRIPT_DIR}/agent"
TARBALL="apache-skywalking-java-agent-${VERSION}.tgz"
URL="https://archive.apache.org/dist/skywalking/java-agent/${VERSION}/${TARBALL}"

if [ -f "${AGENT_DIR}/skywalking-agent.jar" ]; then
  echo "Agent already present at ${AGENT_DIR}/skywalking-agent.jar"
  exit 0
fi

mkdir -p "${AGENT_DIR}"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

echo "Downloading SkyWalking Java agent ${VERSION}..."
curl -fSL "${URL}" -o "${TMP}/${TARBALL}"
tar -xzf "${TMP}/${TARBALL}" -C "${TMP}"
cp -R "${TMP}/skywalking-agent/." "${AGENT_DIR}/"

echo "Agent installed at ${AGENT_DIR}/skywalking-agent.jar"
