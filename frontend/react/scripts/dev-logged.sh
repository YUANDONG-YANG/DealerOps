#!/usr/bin/env bash
set -euo pipefail

log_dir="$(cd "$(dirname "$0")/../../../log-sum" && pwd)"
mkdir -p "$log_dir"

if cutoff=$(date -v-7d +%F 2>/dev/null); then
  :
else
  cutoff=$(date -d '7 days ago' +%F)
fi

for file in "$log_dir"/dealer-web-*.log; do
  [ -e "$file" ] || continue
  name="${file##*/}"
  log_date="${name#dealer-web-}"
  log_date="${log_date%.log}"
  if [[ "$log_date" < "$cutoff" ]]; then
    rm -- "$file"
  fi
done

exec sh -c 'vite 2>&1 | tee -a "$1/dealer-web-$(date +%F).log"' -- "$log_dir"
