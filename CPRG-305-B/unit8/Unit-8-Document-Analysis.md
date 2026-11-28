# Unit 8 Performance Testing — Document Analysis

## Review scope

Reviewed the activity brief, the submitted worksheet, the generated chart, and the submitted PDF/DOCX artifacts for Yuandong Yang's Unit 8 performance-testing exercise.

## Overall result

**Acceptable with minor recommendations.** The required graph, summary, and reflection answers are present. The numerical conclusions are consistent with the supplied data and requirements.

## Findings

### 1. Data and calculations are correct

- Logon/Log off reaches 3.0 seconds at the 500-transaction peak, which meets the stated maximum of 3 seconds but leaves no headroom.
- Purchase steps reaches 5.2 seconds at 500 transactions, below the 7-second maximum.
- Catalog search reaches 11.2 seconds at its 200-transaction peak, exceeding the 10-second maximum.
- Linear interpolation between 150 transactions at 9.0 seconds and 200 transactions at 11.2 seconds gives a threshold crossing at approximately 172.7 transactions, correctly reported as about 173.

### 2. Deliverable coverage is complete

The graph includes both axes, all three transaction series, the three maximum-response-time lines, labels, and the catalog-search failure point. The written summary answers which workloads pass or fail and identifies the visible load knees. All three reflection questions are answered.

### 3. Interpretation notes

- Calling Logon/Log off a pass is technically correct because the observed value is equal to the maximum, but the submission appropriately flags it as a release risk because the margin is zero.
- The phrase “knee before 100 transactions” is a reasonable visual interpretation, but a knee is not directly measured by the data. It should be presented as an observed trend or hypothesis rather than an exact threshold.
- The conclusion that a flat-then-step response curve indicates a saturated session, connection, or authentication pool is a useful hypothesis, not a confirmed root cause. It should be verified with profiling or resource telemetry.

## Recommended follow-up

Keep the current pass/fail conclusions. In a revised version, distinguish measured facts from hypotheses and state that catalog search must be improved and re-tested through the 200-transaction peak before release.

