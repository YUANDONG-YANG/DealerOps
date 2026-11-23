# Unit 9 Docker Test Environment — Document Analysis

## Review scope

Reviewed the activity brief, the submitted Dockerfile, `.dockerignore`, `docker-compose.yml`, report, evidence screenshots, and configuration archive for Yuandong Yang's Unit 9 lab.

## Overall result

**Acceptable.** The required artifacts are present, the archive excludes `node_modules` and coverage output, and the evidence is internally consistent with the reported baseline and container run.

## Findings

### 1. Required artifacts and evidence are present

- `Dockerfile`, `.dockerignore`, and `docker-compose.yml` are included.
- The archive contains the React source, test files, package manifests, and Docker configuration.
- No `node_modules` or `coverage` entries are present in the submitted archive.
- The screenshots show a passing local baseline, a successful image build, a passing Compose run, exit code 0, and coverage files written back to the host.

### 2. Container configuration is coherent

- The Dockerfile copies manifests before source files, installs dependencies in the image, sets `CI=true`, and runs Jest non-interactively.
- The Compose bind mount supplies source files while the anonymous `/app/node_modules` volume preserves the container's Linux dependencies.
- The reported test totals match the evidence: one suite and one test pass in both the local and container runs.

### 3. Reproducibility recommendations

- `npm install` is used in the Dockerfile even though a lock file is present. `npm ci` would enforce the lock file more strictly and make the test image more reproducible.
- `node:22-alpine` is a moving tag. A production-quality pipeline should pin the base image to a reviewed digest or a documented patch-level tag.
- The report says “no manual production steps” in the general automation discussion, but the deployment is still human-approved. The accurate wording is “no ad hoc manual execution steps; human approval gates the automated rollout.”

These are engineering improvements rather than failures against the lab checklist.

