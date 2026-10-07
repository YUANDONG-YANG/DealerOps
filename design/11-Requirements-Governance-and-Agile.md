# Traceability and Scrum (course evidence, light process)

Version v6.0 · 2026-09-21

Business: [DealerOps-Specification.pdf](../requirements/DealerOps-Specification.pdf)  
Hard requirements: [Non-Negotiable-Project-Requirements.pptx](../tech-stack/Non-Negotiable-Project-Requirements.pptx)

Scope changes need written client/instructor approval. Out of scope: a homemade model SDK, a queue, a second database, work orders, leads, a buyer site. The assistant reuses the existing GitHub library.

| ID | What to demonstrate | Source | Who | Which Review |
|---|---|---|---|---|
| NN-01 | Four repositories, four pipelines; ai-service can deploy alone | PPT 1 | B/C | S1 |
| NN-02 | All requests go through the Gateway; direct access fails | PPT 1 | C | S1 |
| NN-03 | Walk through the diagram in 07 | PPT 1 | All | S1 |
| NN-04, NN-06, NN-07 | Runs on Azure; infrastructure as code is `deploy/terraform` (NN-06 allows Terraform); operator-run deploy with compile/validate CI | PPT 2 | B | S2 |
| ~~NN-05~~ | ~~Containerization~~ — dropped, see [SCOPE-BASELINE.md](SCOPE-BASELINE.md) errata item 5 | PPT 2 | B | — |
| NN-08–11 | Username/password login + JWT; Admin / dealership isolation; no plaintext secrets; HTTPS | PPT 3 | C | S2 |
| NN-12 | Open two dealerships and bind people | Spec | C | S3 |
| NN-13 | DMS fields and sale | Spec | A | S3 |
| NN-14 | CRM four fields + attach a vehicle | Spec | C | S3 |
| NN-15/18 | Checklist + a real call to the GitHub component | Spec + PPT 5 | B | S2+ |
| NN-17 | In-store assistant page, same component | GitHub component | A/B | S3 |
| NN-16 | Vehicle/customer changes have audit | Spec | C | S3 |
| NN-19/20 | Critical tests + client walkthrough sign-off | PPT 4 | All | S3 |
| NN-21–24 | Board, 1–2 after-class paragraphs, everyone speaks at Review, biweekly client minutes | PPT 6 | Rotation | Entire course |

## How class time works (do not add process weight)

- One board: To do / Doing / Done; cards use the IDs in the table above.
- Each 3-hour class: 10 minutes of sync at the start; each person writes one progress paragraph at the end.
- At each of the three Reviews everyone must present their own running evidence; one person must not present for the team.
- Client meetings every two weeks; minutes record only decisions and who does what.
