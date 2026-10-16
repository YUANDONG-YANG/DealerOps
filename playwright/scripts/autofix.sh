#!/usr/bin/env bash
# Runs the E2E suite against the private stack (scripts/e2e-stack.sh) and, on failure, asks
# Claude Code to fix the application code. Repeats up to MAX_ROUNDS times. Backend fixes are
# picked up by rebuilding and restarting the private stack; the shared development stack is
# never restarted. It never commits or pushes.
#
# Usage: npm run autofix            (from playwright/)
#        MAX_ROUNDS=5 npm run autofix -- tests/crm.spec.ts
set -uo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$E2E_DIR/.." && pwd)"
WORK_DIR="$E2E_DIR/.autofix"
MAX_ROUNDS="${MAX_ROUNDS:-3}"
SPECS=("$@")

# Files the agent must never touch: the tests themselves and any configuration.
FORBIDDEN_RE='^(playwright/|deploy/|\.github/|dealer-platform/\.env|.*appsettings[^/]*\.json$|.*\.env[^/]*$|.*docker-compose[^/]*$|.*vite\.config\.ts$|.*package(-lock)?\.json$|pnpm-lock\.yaml$)'

command -v claude >/dev/null || { echo "claude CLI not found"; exit 1; }
mkdir -p "$WORK_DIR"

# Content fingerprint of every modified or untracked file, so changes made by the
# agent can be told apart from other people's uncommitted work.
snapshot() {
  (cd "$REPO_DIR" && { git diff --name-only HEAD; git ls-files -o --exclude-standard; } \
    | sort -u | while read -r f; do
        [[ -f "$f" ]] && printf '%s %s\n' "$(shasum "$f" | cut -d' ' -f1)" "$f"
      done)
}

run_tests() {
  (cd "$E2E_DIR" && npx playwright test ${SPECS[@]+"${SPECS[@]}"} --reporter=line) >"$WORK_DIR/e2e.log" 2>&1
}

bash "$E2E_DIR/scripts/e2e-stack.sh" start || { echo "Private stack failed to start"; exit 1; }

for round in $(seq 1 "$MAX_ROUNDS"); do
  echo "== Round $round/$MAX_ROUNDS: running E2E"
  if run_tests; then
    echo "All E2E tests passed."
    exit 0
  fi
  grep -E "passed|failed|flaky" "$WORK_DIR/e2e.log" | tail -3

  snapshot >"$WORK_DIR/before.txt"

  echo "== Round $round: asking Claude to fix"
  (cd "$REPO_DIR" && claude -p "$(cat <<EOF
The Playwright E2E suite in playwright/ failed. Full output: playwright/.autofix/e2e.log.
Structured results: playwright/test-results/results.json. Screenshots, error-context.md
and traces for each failure are under playwright/test-results/.

Fix the application so the failing tests pass:
1. Read the failing test and its error context to understand the expected behavior.
   Check design/ and the API contract when the expected behavior is unclear.
2. Decide whether the defect is in frontend/react, backend/dotnet, or the test itself.
3. Make the smallest correct fix in application source. Follow CLAUDE.md.
4. Do NOT edit anything under playwright/, and do NOT edit configuration files
   (appsettings*.json, .env*, docker-compose, vite.config.ts, package.json, deploy/, .github/).
   If the test is wrong or the fix needs a configuration change, make no change and
   explain why in your final message.
5. Never weaken behavior to satisfy a test (no skipped checks, no swallowed errors).
6. Build what you changed (npm run build in frontend/react, dotnet build for backend).
7. End with a short summary: root cause, files changed, and build result.
EOF
)" \
    --allowedTools "Read" "Grep" "Glob" "Edit" "Write" \
      "Bash(npm run build:*)" "Bash(npx tsc:*)" "Bash(dotnet build:*)" \
      "Bash(git diff:*)" "Bash(git status:*)" "Bash(git log:*)" \
    --disallowedTools "Edit(playwright/**)" "Write(playwright/**)" \
      "Bash(git commit:*)" "Bash(git push:*)" "Bash(git checkout:*)" "Bash(git reset:*)" \
  ) | tee "$WORK_DIR/claude-round-$round.md"

  snapshot >"$WORK_DIR/after.txt"
  touched=$(comm -13 "$WORK_DIR/before.txt" "$WORK_DIR/after.txt" | cut -d' ' -f2- | sort -u)

  if [[ -z "$touched" ]]; then
    echo "Claude made no change. Stopping; see $WORK_DIR/claude-round-$round.md"
    exit 1
  fi
  echo "Files changed this round:"; sed 's/^/  /' <<<"$touched"

  if grep -Eq "$FORBIDDEN_RE" <<<"$touched"; then
    echo "Forbidden file changed (tests or configuration). Stopping for manual review:"
    grep -E "$FORBIDDEN_RE" <<<"$touched" | sed 's/^/  /'
    exit 3
  fi

  if grep -q '^backend/' <<<"$touched"; then
    echo "Backend source changed; rebuilding and restarting the private stack."
    bash "$E2E_DIR/scripts/e2e-stack.sh" restart || { echo "Private stack failed after the fix"; exit 2; }
  fi
done

echo "Still failing after $MAX_ROUNDS rounds; manual investigation needed."
exit 1
