# OMVIC compliance reference (no code to copy)

## Research conclusion

- GitHub / public course projects have **no** ready-made OMVIC listing checker to fork.
- **Read the official site for rules.** This course writes its own fixed rules plus AI review (see design `00` / `09`; historical draft `05` is not coding scope).
- **Pierre** is OMVIC's public **chatbot** for buyer/dealer FAQ. It is **not** an ad-checklist engine. Do not wire it into this course. Do not treat it as a compliance API.

System output may only be "rule hits + human-review suggestions". The UI **must not** say OMVIC approved / certified.

## Official pages you must open

- [OMVIC Advertising Guideline](https://www.omvic.ca/selling/dealer-guidelines-and-resources/advertising-guideline/)
- Price-disclosure related: [All-in Price Advertising](https://www.omvic.ca/buying/your-rights/all-in-price-advertising/)

The lookup date follows the design docs (about 2026-09-09). After the official site revises, the official site wins. Bump the rule version and stale old checks.

## Meaning for coding

| Do | Do not |
|------|--------|
| After reading the guidance, implement **this course's own** fixed rules and copy templates | Copy someone else's "compliance score" or claim legal certification |
| Checklist changes with ad type; overall status is only Blocked / Needs AI review / Passed / Stale / AI unavailable | Treat Pierre, external registry lookups, OCR, or finance/lease checks as scope |
| AI failure must not show Pass; Export TXT only when Passed and not Stale | Hunt the repo for an OMVIC SDK / checker dependency |

Rule details, fields, and the state machine follow the effective `design/` docs. This file only locks: **no third-party checker code is reusable**.
