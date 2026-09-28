# 11 Instructions for Cursor

## Development phase: no test authoring

**Development is not complete. Do not write TEST code until the user confirms feature development is complete and explicitly authorizes test work.**

- Do not create, expand, modify, or refactor unit, integration, or end-to-end tests, empty test skeletons, assertions, test fixtures, mocks, or test-only helpers/configuration. This includes fixes made only to get existing tests to compile or pass.
- Requests to review requirements, inspect code, fix features, build, commit, or push do not authorize test authoring. Do not infer development completion from a successful build or existing coverage.
- Use source review, compilation/builds, and manual feature checks as appropriate. Running existing tests does not authorize editing them; obey any separate restriction on running tests. Report test failures without changing test code during development.
- Test-writing instructions elsewhere in this document or linked plans are deferred, including empty-class and sprint-based test tasks. Keep existing tests; do not delete or disable them to bypass failures.
- This is a student capstone: implement only required behavior and avoid unnecessary complexity.


Issued 2026-09-25 by the reviewer. Based on [10-Cursor-Change-Review.md](10-Cursor-Change-Review.md).

## Rules for this task

- Scope is **minimum spec only**: A2, A3, B4. Nothing else.
- Do not add features, fields, migrations, validation, config files, or refactors.
- Do not edit anything under `requirements/`. The reviewer records results there.
- Do not touch `.gitignore`, `.cursor/mcp.json`, or `dealer-web/vercel.json`. They are the user's own pending changes.
- Do not run unit or integration tests. Compile only (step 5).
- Stop and report if any step fails. Do not improvise a workaround.

## Why

The current working tree (79 modified files, about 25 new) implements A1 and A4–A7 plus unrequested changes, leaves A3 broken (`CustomerService.java:152–154` still rejects sold vehicles), and has design docs that contradict the code. Commit `a4a040d` already contains the correct minimal fix for A2 + A3 + B4 (13 files, +44 / −25). It was reverted in `aefd7b3` only because the reviewer is not supposed to write code. You re-apply it.

## Steps

Run from the repo root `F:\demo\DealerOps`.

### 1. Save your current work on a backup branch (nothing is lost)

```bash
git switch -c backup/cursor-wip-2026-09-25
git add -A -- dealer-core ai-service dealer-web/src dealer-platform/openapi.yaml design requirements
git commit -m "WIP backup: Cursor changes before minimum-spec reset"
git switch main
```

Check: `git status --short` on `main` must show only these three lines:

```
 M .gitignore
?? .cursor/mcp.json
?? dealer-web/vercel.json
```

If `git switch main` refuses because of `.gitignore`, run `git stash push -- .gitignore` before switching and `git stash pop` after.

### 2. Re-apply the minimal fix without the log change

```bash
git cherry-pick -n a4a040d
git restore --staged --worktree requirements/ANALYSIS-LOG.md
```

If a design doc conflicts, keep the lines from `a4a040d` (the cherry-picked side). Change nothing else.

### 3. Check the diff is exactly the minimal fix

```bash
git diff --cached --stat
```

Expected: 12 files, no others.

```
dealer-core/.../compliance/OmvicRuleEngine.java
dealer-core/.../customer/CustomerService.java
dealer-core/.../compliance/OmvicRuleEngineTest.java
dealer-core/.../it/CustomerVehicleLinkIT.java
dealer-web/src/views/CrmView.vue
design/12-Frontend-UI-Conventions.md
design/13-Frontend-Engineering.md
design/14-Backend-API-Contract.md
design/15-Data-Auth-and-Gateway.md
design/16-Acceptance-and-Test.md
design/AI-PROTOCOL-AND-RULES.md
design/SCOPE-BASELINE.md
```

### 4. Spot-check the three fixes

| Item | File | Must see |
|---|---|---|
| A2 | `OmvicRuleEngine.java` | `showsRateOrPayment` set for `CASH` ads matching `APR` or `PAYMENT`; `if (listing.getAdKind() == AdKind.FINANCE \|\| showsRateOrPayment)` |
| A3 | `CustomerService.java` `link()` | **No** `VehicleStatus.IN_STOCK` check. `existsByVehicleId` → `VEHICLE_ALREADY_LINKED` still there. `unlink()` still returns `SOLD_LOCKED` for sold. |
| A3 | `CrmView.vue` `loadLinkOptions()` | `vehiclesApi.list({ page: 0, size: 50 })` with no `status` filter |
| B4 | `SCOPE-BASELINE.md` | Erratum 4 line present |

### 5. Compile only

```bash
cd dealer-core && mvn -q -DskipTests compile && cd ..
```

Must exit 0.

### 6. Commit

```bash
git commit -m "Apply finance rules to ads that show a payment and let sold vehicles reach their buyer."
```

### 7. Report back

Paste the output of these into the chat for the reviewer:

```bash
git log --oneline -3
git show --stat HEAD
git status --short
git branch --list "backup/*"
```

## Not in this task

A1 checklist, A4 AI-notes-block, A5 wider stale triggers, A6 validation, A7 rules config, assistant counts, audit / admin / DMS / CRM UI changes. They stay on `backup/cursor-wip-2026-09-25`. If the user later wants any of them, each becomes its own task with its own review.
