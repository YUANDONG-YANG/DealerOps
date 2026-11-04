# Defect and progress rules

CPRG-305-B Group Assignment 3. System under test: the active .NET 10 stack (`DealerOps.Gateway`, `DealerOps.Core`, `DealerOps.AiService`) and the React app in `frontend/react`. Java and Vue are retired. Their execution totals are not inputs to this workbook.

Sources for the columns and scales below:

- `CPRG-305-B/group-assignment-3/attachments/CPRG305_Software_Test_Execution_Report_Template.docx` (sections 3, 5, 6, and 7)
- `CPRG-305-B/group-assignment-3/attachments/CPRG305_Defect_Tracking_Template.xlsx` (header row)
- `CPRG-305-B/group-assignment-3/attachments/Assignment 3_Test Execution_Spring 2024_Rev1.docx` (Docker network or virtual machine; localhost is not an accepted environment)

The course spreadsheet sample row (`D-001`, `TC-102`, "Login button not responding", severity word "High", `P1`, `Open`, "QA Tester", "Dev Team A", 2025-09-16) is placeholder text. Do not copy it into the DealerOps workbook.

## Severity (S1–S4)

Use only these codes. The wording is the course report template, section 5:

| Code | Template wording |
|---|---|
| S1 | Critical: Causes system crash or major failure |
| S2 | High: Major functionality blocked |
| S3 | Medium: Minor functionality affected |
| S4 | Low: Cosmetic issue or improvement suggestion |

Do not store the sample word "High" in the Severity column. A major functional block is `S2`.

## Priority (P1–P4)

The report template lists Priority as its own field, separate from Severity. The defect spreadsheet template's only demonstrated priority code is `P1`.

The rebuilt workbook stores only `P1`, `P2`, `P3`, or `P4` in Priority. The course template does not define `P2`, `P3`, or `P4` in words. This note does not add definitions for them. Do not write "High", "Medium", or "Low" in Priority, and do not copy Severity into Priority.

## Defect sheet columns

Header row, in this order. Names match the course defect spreadsheet. Module and Fix Verified are the two additions, taken from report section 7.

| Column | Rule |
|---|---|
| Defect ID | `D-001` style, one id per real defect, issued only when a row is created. |
| Test Case ID | The formal case that failed. Must match one formal log row. |
| Defect Summary | One line on the observed failure. |
| Module | .NET or React area that failed (Gateway, Core, AiService, or Web). From report section 7. |
| Severity | `S1`, `S2`, `S3`, or `S4` only. |
| Priority | `P1`, `P2`, `P3`, or `P4` only. |
| Status | `Open` or `Closed`. The template sample status is `Open`. `Closed` requires a Resolution Date. |
| Detected By | One of the three names below. |
| Date Detected | ISO date `YYYY-MM-DD` of the formal run that failed. |
| Assigned To | One of the three names below. The cell is the person's name, not the role title. |
| Root Cause | Blank until someone has actually found the cause. |
| Resolution | Blank or a short statement of the fix. The sample word "Pending" is not a default. |
| Resolution Date | Blank while Status is `Open`. ISO date when Status becomes `Closed`. |
| Fix Verified | `Y` or `N`. From report section 7. `Y` only after a later formal Docker or VM run of the same Test Case ID is `PASS`. A localhost retest cannot set `Y`. |
| Comments | Evidence note. No secrets, tokens, or connection strings. |

Report section 7 also has Open Date and Closed Date. In this workbook those are Date Detected and Resolution Date. Do not add a second pair of date columns.

## Names and roles

Detected By, Assigned To, and the progress Tester cell may contain only:

- Yuandong Yang
- Daniel Watson
- Xiaomei He

Roles stay as follows. They are labels for sign-off and for who owns the work. They are not extra names, and they are not substitutes for the name in Detected By or Assigned To.

| Name | Role |
|---|---|
| Yuandong Yang | QA Lead |
| Xiaomei He | Development/Integration Lead |
| Daniel Watson | Workflow/Acceptance Lead |

The course sign-off table has QA Lead, Development Lead, and Project Manager. For this group, QA Lead is Yuandong Yang and Development Lead is Xiaomei He. This group has no fourth person and no separate Project Manager. Do not add Bedgel Fadhil Ndam Woukouo, Jackson Warga, Logan Jones, "QA Tester", or "Dev Team A".

## When a defect row may exist

Create a row only when a formal Docker or VM execution of a formal test case has result `FAIL`.

Do not create a row for:

- `NOT RUN`
- a process that was not listening, a closed port, or a missing Docker daemon
- a localhost, loopback, Vite, or Playwright observation
- an Azure App Service check (that host is not a Docker network and not a VM)
- a retired Java or Vue result
- the course template sample row

Every defect Test Case ID must match one formal log row whose Result is `FAIL`. A `FAIL` with no defect row is an incomplete log. A defect whose case is `PASS`, `NOT RUN`, supplemental, or local-only is not allowed.

Status stays `Open` until Resolution Date is set. Fix Verified stays `N` until the same Test Case ID passes on a later formal Docker or VM run.

## Product defects observed by this worker

No product defect observed by this worker.

`design/` has no open product-defect register. The drafts available while this note was written record `NOT RUN` because the stack was not running. That is not a product failure. The defect sheet is a header row and zero data rows. Do not type a zero into a results cell to represent that; the count formulas below return zero when the data range is empty.

## Formal UAT

Formal UAT is **NOT RUN** until a stakeholder session exists.

Acceptance cases that the Assignment 2 plan ties to a client representative stay `NOT RUN` until that session. Reading a script, or a developer walking the UI on a local machine, is not that session. `NOT RUN` is not a pass and is not a fail. The missing session does not create a defect row.

## Progress sheet columns

One row per day on which a formal Docker or VM result changes. Counts on that row are cumulative through that date. Add the template columns from report section 6, plus Defect Ratio, which the same section defines as a formula.

| Column | Meaning |
|---|---|
| Date | ISO date of the snapshot. |
| Tester | Yuandong Yang, Daniel Watson, or Xiaomei He. |
| Total Planned | Formal Docker/VM cases in the denominator. |
| Total Executed | Those cases with result `PASS`, `FAIL`, or `BLOCKED`. |
| Passed | Result `PASS` only. |
| Failed | Result `FAIL` only. |
| Blocked | Result `BLOCKED` only. |
| Cumulative % Completed | Executed / Planned. |
| Cumulative % Passed | Passed / Executed. |
| Defect Ratio | Failed / Executed. |
| Comments | Short note for that day. |

Do not add a progress row for a day with no formal Docker or VM activity.

## Denominator rules

The test log is one row per test case. Columns the formulas read:

| Column | Allowed values that matter |
|---|---|
| Test Case ID | The Assignment 2 case id. Unique among formal rows. |
| Environment | `Docker` or `VM` to count. Any other value does not count. |
| Result | `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`. |
| Row Kind | `Formal` to count. `Supplemental` does not count. |
| Date | ISO date. Used for the cumulative cutoff. |
| Counts | Formula, not a typed flag. See below. |

A row counts only when all of the following are true:

- Row Kind is `Formal`.
- Environment is `Docker` or `VM`. The Assignment 3 brief accepts one of those two. Localhost is not accepted.
- The Test Case ID is the first formal row for that id. A second row with the same id is a clone and does not count.

Excluded from Planned, Executed, Passed, Failed, Blocked, and every ratio:

- Local-only observations: localhost, `127.0.0.1`, the Vite dev server, the Playwright local E2E stack, and any other run that did not happen on Docker or a VM.
- Azure App Service observations. The current deploy is not a Docker network and not a virtual machine, so it is outside this denominator.
- `NOT RUN`. It stays out of Executed, Passed, Failed, and Blocked. It is not a pass. A formal Docker or VM case that is still `NOT RUN` remains in Planned only.
- Supplemental rows: notes, retests, exploratory rows, evidence attachments, and the course sample defect.
- Cloned rows. Do not copy a case to raise Planned or Executed. A re-run replaces the formal row, or it is stored as `Supplemental` and excluded.

Retired Java workbook totals **87**, **76**, and **11** are not Planned, Passed, Failed, or any other cell. Do not paste them. Do not derive a .NET total by editing those figures.

Assignment 2's case list is the catalogue of case ids. Membership in that list does not by itself put a case into Planned. The case enters Planned only when its log row is formal and its Environment is `Docker` or `VM`.

## Excel formulas

Percentages and counts are formulas. Format the three ratio columns as percentages. Never type a percentage, a count, or a density.

On `TestLog`, with headers in row 1 and data from row 2:

- A = Test Case ID
- B = Environment
- C = Result
- D = Row Kind
- E = Date

`TestLog!F2` (Counts), filled down:

```excel
=AND(D2="Formal",OR(B2="Docker",B2="VM"),COUNTIF($A$2:A2,A2)=1)
```

On `Progress`, for a snapshot in row 2, with Date in `A2`:

```excel
C2 =COUNTIFS(TestLog!F:F,TRUE,TestLog!E:E,"<="&A2)
D2 =COUNTIFS(TestLog!F:F,TRUE,TestLog!E:E,"<="&A2,TestLog!C:C,"PASS")+COUNTIFS(TestLog!F:F,TRUE,TestLog!E:E,"<="&A2,TestLog!C:C,"FAIL")+COUNTIFS(TestLog!F:F,TRUE,TestLog!E:E,"<="&A2,TestLog!C:C,"BLOCKED")
E2 =COUNTIFS(TestLog!F:F,TRUE,TestLog!E:E,"<="&A2,TestLog!C:C,"PASS")
F2 =COUNTIFS(TestLog!F:F,TRUE,TestLog!E:E,"<="&A2,TestLog!C:C,"FAIL")
G2 =COUNTIFS(TestLog!F:F,TRUE,TestLog!E:E,"<="&A2,TestLog!C:C,"BLOCKED")
H2 =IF(C2=0,"",D2/C2)
I2 =IF(D2=0,"",E2/D2)
J2 =IF(D2=0,"",F2/D2)
```

`H2` is Cumulative % Completed. `I2` is Cumulative % Passed. `J2` is Defect Ratio. Copy the row down for later dates; each row keeps its own date in column A. An empty formal log leaves Planned at 0 and leaves all three ratios blank. A blank ratio is not 100% passed and is not a typed 0%.

Report section 3 uses the same formulas, not a second set of numbers:

| Section 3 metric | Formula |
|---|---|
| Total Test Cases Designed | `=Progress!C2` on the latest snapshot |
| Total Test Cases Executed | `=Progress!D2` |
| Total Passed | `=Progress!E2` |
| Total Failed | `=Progress!F2` |
| Blocked / Deferred | `=Progress!G2` |
| Execution Coverage (%) | `=Progress!H2` |
| Defect Density (Defects/Test Cases) | `=IF(Progress!C2=0,"",COUNTA(Defects!A2:A500)/Progress!C2)` |

`COUNTA` on the defect id column is the defect count. With only a header, it is an empty range and the formula returns 0 through division when Planned is greater than 0, or blank when Planned is 0. Do not replace that expression with a typed 0. Duration of Testing stays blank until a formal Docker or VM session has a real start and end.

Check, also a formula, on the same snapshot:

```excel
=D2=E2+F2+G2
```

That check must be TRUE. `NOT RUN` is outside Executed, so it is not part of the sum.
