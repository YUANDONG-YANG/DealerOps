# Reflection

The raw answer was checked against the current design text, not against `design/archive/`. No row was rewritten after that check.

> **Update after execution.** This document is the reading-only review. The cases were afterwards
> run against the live API, and two expected results turned out to be wrong: a whitespace-only
> `task` and a whitespace-only `completionNote` are both rejected, not accepted. Both are argued for
> as accepts further down this file, under "Which rows depend on an interpretation". See
> [improved-test-cases.md](improved-test-cases.md) for the corrected rows, the mechanism behind each,
> and the four previously unclassified cases that the run settled. The page-size analysis below was
> confirmed in full. One place where a literal reading of this assignment brief would have been wrong is page size. The prompt quoted the design sentences, so the raw answer clamps `size` instead of rejecting every value other than 10.

## Bounds actually used

| Field | Bound used | Where it is written |
|---|---|---|
| Username length | 3–64 | `design/21-Feature-Extensions.md` AUTH-16; `design/14-Backend-API-Contract.md` §1.5 |
| Username characters | letters, digits, `.`, `_`, `-`, and at least one letter | same two places. AUTH-16 states them in the same sentence as the length |
| Task | 1–200 | `design/21-Feature-Extensions.md` WO-01; `design/14-Backend-API-Contract.md` §4.7 |
| Completion note | 1–500 | `design/21-Feature-Extensions.md` WO-03. §4.7 states absence as invalid and the maximum as ≤ 500 |
| Cost | ≥ 0, no maximum | `design/21-Feature-Extensions.md` WO-03; `design/14-Backend-API-Contract.md` §4.7 |
| Page size | default 10; ≤ 0 becomes 10; 1–100 used as requested; > 100 becomes 100 | `design/14-Backend-API-Contract.md` §1.1. LEAD-05 and the leads screen say 10 per page |

These lengths match the brief: username 3–64, task 1–200, note 1–500, cost ≥ 0.

## Disagreement with the brief

The brief says page size is fixed at 10. The documents do not say that.

- NFR-01 is the sentence "Lists default to 10 per page". That sentence is not a row inside `design/`. `design/21-Feature-Extensions.md` LEAD-05 cites it: "10 per page (NFR-01)". The sentence itself is in `requirements/iteration-1/DealerOps-Requirements.md` and `requirements/analysis/05-Cross-Cutting.md`. The word is **default**, not **only**.
- `design/14-Backend-API-Contract.md` §1.1: `size` defaults to 10, the cap is 100, `size` ≤ 0 is read as 10, `size` > 100 is read as 100, and the envelope echoes the size actually used. Screens still request 10.
- `design/13-Frontend-Engineering.md` §5.5a and `design/12-Frontend-UI-Conventions.md` §2 say the leads table (and tables in general) show 10 rows per page. That is the screen request. It does not say the server returns 400 when `size` is 9 or 11.

So P-03 (`size=9`) and P-04 (`size=11`) are accepts with echoed sizes 9 and 11. Treating them as rejects would score a pass as a fail. The CRM link picker in `design/13-Frontend-Engineering.md`, which requests 10 and also caps the adopted size at 10, is a different client. It was not used as the lead-list rule.

No other brief number was changed. Username, task, note, and cost match the design numbers.

A smaller wording gap, not a numeric one: WO-03 says the note is 1–500. §4.7 says "`DONE` without a completion note (≤ 500)". The minimum of 1 is explicit only in WO-03. Empty and omitted notes are rejects under both wordings if a blank value is "without a completion note". N-01 and N-07 follow that. The maximum 500 is the same in both.

## Which rows are mechanical

Mechanical rows are off-by-one points on a closed range the requirement states in numbers, with one cause, and with the status the contract names. A grader can mark them without choosing an interpretation.

| Rows | Why they are mechanical | Requirement |
|---|---|---|
| U-01–U-07 | Length 2, 3, 4, 63, 64, 65, and empty, on the stated 3–64 range. Rejects name `username` because AUTH-16 says every error names its field | AUTH-16 |
| U-08 | Length 3, allowed characters, zero letters. The same AUTH-16 sentence requires at least one letter | AUTH-16 |
| U-09 | Length 3, a space. Space is outside the stated character list | AUTH-16 |
| T-01–T-06 | Length 0, 1, 2, 199, 200, 201 on the stated 1–200 range | WO-01 |
| N-01–N-07 | Length 0, 1, 2, 499, 500, 501, and omitted, on the stated 1–500 range and the "without a completion note" rule | WO-03 |
| C-02, C-03, C-06 | `-1` is below 0, `0` is the stated inclusive minimum, null is "without a cost ≥ 0" | WO-03 |
| P-01, P-02 | Omitted `size` and `size=10` both echo 10. That is the default sentence | NFR-01, LEAD-05 |
| P-05, P-06, P-10, P-11 | `0` and `-1` echo 10; `100` echoes 100; `101` echoes 100. Those four outcomes are written as inequalities in §1.1 | LEAD-05 for the list under test; the clamp numbers are §1.1, not a separate requirement id |

P-07, P-08, and P-09 (`size` 1, 2, and 99) are the remaining formal bounds of "not ≤ 0 and not > 100". They are mechanical once §1.1 is read as a clamp rather than a reject, because the two inequalities leave 1–100 unchanged. They are still accepts.

## Which rows depend on an interpretation

| Row or gap | Interpretation | How it was scored | Requirement the row still traces to |
|---|---|---|---|
| U-10 `Ab1` | "Letters" is not spelled out as A–Z / a–z. Upper case is the ordinary reading of "letters" | Accept. Low risk. Not a separate invalid class | AUTH-16 |
| Non-ASCII letter, such as `äb1` | The rules never say whether it is a letter | No expected result. Left unclassified in the raw answer | AUTH-16 |
| Trim of username, task, or note | Vehicle make/model are trimmed in §4.2. These three fields have no trim sentence | Spaces count toward length. A username space is U-I3. A task or note is not failed for being blank | AUTH-16, WO-01, WO-03 |
| One-space task or one-space note | The ranges are length ranges. They do not say "non-blank" | Not a fail. A grader who requires meaningful text is adding a rule | WO-01, WO-03 |
| C-01 `-0.01` and C-04 `0.01` | WO-03 does not state the step. `-1` is enough to show the negative class. `0.01` is min+1 only if the step is one hundredth | Both negatives reject. `0` accepts. `0.01` and `1` (C-05) both accept. Do not require the hundredth as the only correct min+1 | WO-03 |
| Third decimal, cost above `9999999999.99`, cost as a JSON string | Vehicle costs in §4.2 refuse a third decimal. Payments require two decimals. WO-03 and §4.7 do not say that for work-order cost. `DECIMAL(12,2)` is the column in `design/21-Feature-Extensions.md` §4, and money is a JSON number in §0 of `design/14-Backend-API-Contract.md` | No expected result. Inventing a maximum or a third-decimal reject would not trace to WO-03 | WO-03 |
| P-03, P-04 | Only if someone reads LEAD-05 "10 per page" as "the server rejects every other size" | Accept, echoed 9 and 11. The API sentence is the clamp, and NFR-01 says default | LEAD-05, NFR-01 |
| Non-numeric or fractional `size` | §1.1 talks about numeric comparisons. It does not name a status for a non-number | No expected result | none invented |

## Requirement trace

No requirement id was added. Each row uses an id that already exists.

| Rows | ID | Path |
|---|---|---|
| U-01–U-10 | AUTH-16 | `design/21-Feature-Extensions.md`; HTTP detail in `design/14-Backend-API-Contract.md` §1.5 |
| T-01–T-06 | WO-01 | `design/21-Feature-Extensions.md`; `design/14-Backend-API-Contract.md` §4.7 |
| N-01–N-07, C-01–C-06 | WO-03 | `design/21-Feature-Extensions.md`; `design/14-Backend-API-Contract.md` §4.7 |
| P-01–P-11 | LEAD-05, and NFR-01 for the default of 10 | LEAD-05 in `design/21-Feature-Extensions.md`. Screen wording in `design/13-Frontend-Engineering.md` §5.5a. Clamp and envelope in `design/14-Backend-API-Contract.md` §1.1. NFR-01 wording in `requirements/iteration-1/DealerOps-Requirements.md` and `requirements/analysis/05-Cross-Cutting.md` |

Duplicate username, work-order status transitions, and selling a vehicle are outside this partition set. They are other requirements (AUTH-16's 409 branch, WO-02, WO-05) and are not given rows here.
