# Unit 12 Deployment Case Study — Document Analysis

## Review scope

Reviewed the activity brief and the submitted deployment plan for Yuandong Yang's Unit 12 case study.

## Overall result

**Strong and substantially complete.** The submission covers the selected strategy, deployment sequence, automation tools, risk controls, DevOps and CI/CD roles, and all reflection questions.

## Findings

### 1. Strategy and plan fit the scenario

Blue/Green deployment with a controlled canary ramp is a defensible choice for a revenue-critical e-commerce site. The plan keeps the current version serving traffic, verifies the new version before full exposure, defines numeric go/no-go criteria, and provides a fast traffic-shift rollback.

The expand/contract database migration approach, external session/cart state, cache warming, observability, feature flags, and post-deployment reconciliation address the main operational risks.

### 2. Tooling and process coverage are complete

The plan names appropriate tools for source control, CI/CD, containers, orchestration, traffic control, infrastructure as code, secrets, migrations, testing, feature flags, and monitoring. It also explains how the tools support automation, collaboration, feedback, and continuous improvement.

### 3. Clarifications recommended

- “Blue/Green + canary” is a layered strategy. State explicitly that Blue/Green is the environment and rollback model, while canary is the traffic-exposure control layered on top.
- The statement that green starts sized for only the canary slice is risky. Green should be provisioned and load-tested so it can safely absorb the planned ramp and expected peak before traffic is increased; otherwise under-capacity can create a false release failure.
- “No manual production steps” conflicts with the later human approval gate. Replace it with “no ad hoc manual execution steps; human approval gates the automated rollout.”
- Prefer sandbox-only payment verification in the production-like green environment. A “low-value test order” in live production needs explicit isolation, reconciliation, and authorization because it can create real financial and customer-data side effects.

These are hardening recommendations, not omissions of a required assignment section.

