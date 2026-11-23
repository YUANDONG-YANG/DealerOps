# Status Report 3 Materials Review

**Reviewed:** 2026-11-23  
**Files:** `DealerOps_Status_Report_3_Completed.docx`, `DealerOps_Status_Report_3_Presentation.pptx`, and `Status_Report_3_Final_Technical_Presentation.docx` (the assignment instructions/template).

## Overall assessment

The status report and slide deck cover the required architecture, feature status, demo, challenges, feedback, and submission plan. The deck has a clear visual system and separates the seven-slide talk from its Q&A backup slides. The main issues are an inconsistent count of open client-review items and small text in the two architecture diagrams used in the main talk.

## Findings

### 1. The client-review delivery count does not reconcile

In the report's executive summary and §3, the prose says **seven themes were delivered and two were open**. The status table in §3 marks themes 1 through 8 Delivered and theme 9 Open, which is **eight delivered themes and one open theme**. Theme 9 itself combines two unresolved requests: replacing public sign-up with dealership inquiry and matching VINs on decoder replies. This may explain the “two open” count, but the report needs to distinguish theme count from request count.

The report's §9 then says **all nine themes were carried through implementation and tests**, which conflicts with the open status recorded in §3. The slide deck repeats that claim in the “Adjustments and documentation” slide and says every theme was carried through requirements, contract, code, and tests. Rewrite these statements to separate completed work from the two unresolved requests.

### 2. Completion language obscures the unresolved items

The report and slide 2 say development is complete and that the only remaining work is presentation preparation and submission. However, the report also records two client requests as open and VIN decoding as an external dependency; the deck's backup slides also label VIN availability as open. Clarify that the planned implementation scope is complete while the two client-requested changes remain unresolved, and state whether those items are out of scope, deferred, or still awaiting a decision. This makes the completion statement consistent with the limitations table.

### 3. Architecture diagrams are too small for the main presentation

The visual review in WPS showed that slides 3 and 4 scale detailed architecture and deployment diagrams down enough that their internal labels are difficult to read at normal presentation size. These are central technical slides, so simplify each diagram or show a larger, more focused view and move secondary details to backup slides. The flow diagrams on backup slides 9–11 remain readable at the displayed size.

## Positive checks

- The report covers the assignment's required sections, including the live-demo plan, challenges, prior feedback, completion status, and final-delivery tasks.
- The deck contains 16 slides. Slides 8–15 are explicitly marked as Q&A backup material, and slide 16 closes with questions.
- The nine demo-step durations total 7 minutes 15 seconds; the speaker notes budget roughly 1 minute 45 seconds for slides 1–6 and place the talk plus demo at about 9 minutes, within the 10-minute stop.
- The reported workload reconciles: 27 hours per member × 4 members = 108 team hours.
- The report's one-command release reference (`./deploy/deploy.sh --apply --seed`) matches the command documented in `deploy/README.md`.
- The completed report's first page and architecture section were visually inspected in WPS. The deck was opened in WPS and reviewed across all 16 slides. No clipping or overlap was apparent on the inspected report pages or slides; the diagram-label legibility issue above remains.

## Scope note

`Status_Report_3_Final_Technical_Presentation.docx` is the assignment brief and blank template, not a project deliverable. I used it as the rubric for the other two files. It contains the assignment's original wording and was not treated as project-authored content.

The reported 463 Playwright tests across 41 spec files were checked for consistency between the report and deck, but were not independently rerun in this review.
