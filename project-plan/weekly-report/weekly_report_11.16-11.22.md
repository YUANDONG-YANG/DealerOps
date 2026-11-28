# Weekly report — 16 – 22 November 2026 (ISO week 47)

| Field | Value |
| --- | --- |
| Phase | Sprint 3 |
| Active days | 16 and 18 November |
| Commits | 20 (`b7f3f1e` … `3f7e3ba`) |
| Contributors | Yuandong Yang (Robin), recorded under `robin` |
| Volume | +40,963 / −65 lines, mostly re-exported PDFs, inlined SVGs and generated HTML |
| Milestones | Sprint 3 status report, project plan and presentation deliverables completed 18 November; no commits 19–22 November |

## Progress against the plan

Last week finished DMS-19 and DMS-20, which left the Sprint 2 behavior ready to accept. This week
was about Sprint 3 documentation: getting everything a reviewer needs into one place. Only one
product-code change went in, a cleanup of the audit log UI. The rest of the week went into
documents: the Sprint 3 status report, the project plan update, the rebuilt presentation deck, and
a system design page and PDF that point each design claim at the file that delivers it. Work
stopped after 18 November and nothing was committed over the rest of the week.

## Summary of activities

**1. Polished the audit log UI.** The table now fits its container without horizontal scrolling,
the Changes cell is cut down to one line, and the full change JSON opens in a Details modal and a
side drawer instead of spilling out of the table (`4c1a399`, `22c6636`). This was the only
product-code change of the week. It touched `AuditLogPanel.tsx`, the shared styles and the
Playwright UI spec that covers the panel.

**2. Finished the Sprint 3 status report.** The leftover placeholders were filled in with the real
test results, the container decision, the adjustments from the previous feedback and the delivery
dates. The yellow to-do highlighting came out once the report was done (`be946ef`, `7dad010`). The
report was then expanded with full project detail, all 15 diagrams, and the updated plan and
backlog showing 27 completed hours per member (`7996288`, `3ea6fc3`).

**3. Added the Sprint 3 tasks to the project plan.** Each task page records 27 completed hours per
member, which keeps the plan and the status report in agreement (`bf3475b`).

**4. Reorganized the design diagrams and rebuilt the presentation deck.** The `design/diagrams`
tree was split into business, integration and architecture groups, the Sprint 3 presentation
deliverables were added, and the deck was rebuilt so it pulls its diagrams from that tree instead
of keeping its own copies (`d483b7d`, `140fd79`).

**5. Made the system design page the one place to read about the system.** It now carries delivery
evidence, so each design claim links to the file that delivers it, and feature deep-dives and a
reader's guide per role were added next (`1713896`, `da7ade6`). Every SVG under `design/diagrams`
was inlined so the HTML renders on its own, and the 84-page PDF was re-exported from it
(`8bdc92f`, `d041652`). The table of contents was put into collapsible sections and then reordered
so it reads product first, then architecture, development and operations (`f4e5454`, `f2d706b`).

**6. Added the user manual and refreshed the poster.** The manual walks step by step through the
public buyer, sales, manager, owner and admin tasks (`60c15a2`). The 36×48-inch capstone poster PDF
was re-exported from the current poster HTML as one page (`5e63a79`, `3f7e3ba`).

**7. Separate CPRG-305-B coursework.** Units 8–12 activities and submissions for the SAIT
CPRG-305-B course were committed in this repository, and the bug-fixed screenshots were removed
(`04ae6b0`). These belong to a different class and have nothing to do with the capstone project or
its team.

## What was delivered

- Audit log UI that fits its container, with the full change detail in a modal and a side drawer, and the Playwright UI spec that covers it.
- The finished Sprint 3 status report, with real test results, the container and feedback decisions, 15 diagrams and 27 hours per member.
- Sprint 3 task pages in the project plan, matching the status report.
- A regrouped design-diagram tree, and a Sprint 3 deck built from it.
- A system design page that renders on its own, with delivery evidence, feature deep-dives, a reader's guide and a re-exported 84-page PDF.
- A user manual written per role, and the re-exported 36×48-inch poster PDF.

## Impediments and how they were handled

- **Documentation was behind the code.** The system did more than the review material described.
  Linking each design claim to the file that delivers it, and filling the status-report
  placeholders with real results, brought the two back together.
- **The design page needed its sibling folder.** It referenced the SVG files externally, so it did
  not render by itself. Inlining every SVG fixed that for the page and for its PDF.
- **Generated files inflate the diff.** Most of the line count is re-exported PDFs, inlined SVGs
  and generated HTML. The audit log UI was the only hand-written code change this week.

## What went well

The Sprint 3 deliverables now agree with each other. The status report, the project plan, the deck,
the system design page and the user manual all describe the system that is actually running.
Someone reviewing the project can start at the design page and get to the file behind any claim
without opening the repository.

## Carried into the next week

- Run the full manual acceptance pass over the finished Sprint 2 and Sprint 3 behavior.
- Present the Sprint 3 deck, and keep the system design page in step with any late changes.
- Keep the Azure backup and seed-refresh procedure in place before the next destructive deployment.
