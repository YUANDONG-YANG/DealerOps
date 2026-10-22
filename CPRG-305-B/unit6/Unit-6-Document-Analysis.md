# Unit 6 Bug Hunt Adventure — Document Analysis

Source documents (all in `CPRG-305-B/unit6/`):

- `Unit 6 Activity Bug Hunt Adventure Functional Testing.docx` — workshop brief
- `Unit 6 Activity Bug Hunt Adventure Worksheet.docx` — submission template
- `Unit 6 Bug Hunt Use Cases.docx` — test basis
- `CPRG305_Bug_Hunt_React_App/README.md` — how to run the app

This note records what the documents require. It does not record executed tests or confirmed defects. The React app is described as intentionally defective; findings belong in the worksheet only after a run shows a mismatch with a use case.

## 1. What the activity is

Title: Bug Hunt Adventure: Functional Software Testing Workshop.

Goal: act as a functional tester on the CPRG305 Bug Hunt React App. Explore the running app, write test cases from an assigned use case, execute them, and log defects in the worksheet.

Learning outcomes stated in the brief:

- Understand what functional testing is and why it matters.
- Write and execute test cases against the features in the app.
- Document defects with a required structure, including severity.

Functional testing, as defined in the worksheet, checks what the system does against business requirements. A defect exists only when the actual result differs from the behaviour defined in the use case. The use-case handout repeats that rule: do not file a bug for a personal preference or an unstated expectation.

## 2. Session shape and deliverable

| Step | Time | Work |
| --- | --- | --- |
| 1. Briefing | 20 min | What functional testing is; example of action, expected result, actual result |
| 2. Bug hunt | 40 min | Individual work on the assigned feature |
| 3. Submission | 10 min | Completed worksheet: test cases plus bug reports |

Preparation already done in this folder:

- App extracted to `CPRG305_Bug_Hunt_React_App/`. README says run `npm install`, then `npm run dev`, and open the Vite URL.
- Login credentials in the README: username `admin`, password `password`. The same pair is the only valid combination in UC-01.
- Worksheet is the log and the thing that gets submitted. There is no separate bug tracker.

Work is individual. Each person is assigned one feature: Login Process, Product Search, Add to Cart, or Remove from Cart. The documents do not say which feature is assigned to this student. That choice has to come from the facilitator before test cases are written.

## 3. Concepts the worksheet expects

| Concept | Definition in the worksheet | Example given |
| --- | --- | --- |
| Test case | Conditions used to decide whether a feature works | Valid username and password can log in |
| Bug / defect | Flaw that produces an incorrect or unexpected result | Add to Cart does nothing |
| Severity | Impact on the system or the user | High: crash or data loss. Medium: feature not working. Low: cosmetic, such as a misspelled word |

Severity on the bug form is only Low, Medium, or High. There is no Critical level.

## 4. How a test case must be built

From the use-case handout, in order:

1. Review the use case for the assigned feature only.
2. Pull test conditions from the main flow, alternative flows, exception flows, and business rules.
3. Turn each condition into a test case with specific data, repeatable steps, and an observable expected result.
4. Execute it in the app.
5. Compare actual result with the use-case expected result.
6. Mark Pass or Fail. Write a bug report only for a confirmed mismatch.

A use case describes required behaviour. A test case verifies one path, condition, or rule. One use case produces several test cases.

The worksheet test-case table has these columns:

| Column | Meaning |
| --- | --- |
| Test Case ID | `T-001`, `T-002`, … |
| Test Objective | What is being tested |
| Test Steps | Numbered actions |
| Expected Result | From the use case, not from guessing |
| Actual Result | What the app did |
| Status | Pass or Fail |
| Bug ID | Only if Failed, for example `B-001` |

The printed template starts at `T-001` and continues (`T-002`, `T-003`, …). Extra rows go on another sheet. Expected results must come from the assigned use case.

## 5. Mandatory bug report

Every Fail needs a report. Fields, in the order the brief requires:

| Field | Rule | Example in the brief (illustration only) |
| --- | --- | --- |
| Bug ID | Unique, sequential | `B-001` |
| Test Case ID | The failed case | `T-002` |
| Summary | One-line title | Blank password displays an unclear validation response. |
| Steps to Reproduce | Numbered, exact | Open app; enter `admin`; leave password blank; select Login. |
| Expected Result | What the use case requires | Deny access and say the password is required. |
| Actual Result | What happened | Access denied, but message is “Error: Username and password cannot be empty!” |
| Severity | Low, Medium, or High | Medium |
| Evidence | Screenshot, recording, or a clear description of where it is visible | Screenshot of filled username, blank password, and the error |

The brief’s blank-password example is a sample of report quality. It is not a confirmed defect in this build. UC-01 A2 says a blank password must show “Password cannot be empty.” A report is valid only if the running app actually shows something else.

The worksheet also asks three reflection answers:

1. Most valuable bug: which finding had the highest severity, and why.
2. Testing perspective: happy path versus edge cases, and why both matter.
3. Reporting best practice: whether Summary, Steps to Reproduce, or Severity is the most critical part of a good report, with a reason.

## 6. Use cases (the test basis)

Four use cases. Test only the assigned one, but the cart and search cases all require a successful login first.

### UC-01 Log In to the Application

- Actor: user. Precondition: login page is displayed.
- Goal: access the app with valid credentials.
- Main flow: enter username, enter password, select Login, system validates, grants access, shows a welcome message that contains the username.
- Rules: valid pair is exactly `admin` / `password`. Both fields are required. Any other combination is denied. The app must not reveal which of the two fields is wrong. Success text is “Welcome, admin!”.

| Flow | Input | Required outcome |
| --- | --- | --- |
| Main | `admin` / `password` | Access granted. Message: “Welcome, admin!” |
| A1 | Blank username, password filled | Denied. “Username cannot be empty.” |
| A2 | Username filled, blank password | Denied. “Password cannot be empty.” |
| A3 | Both blank | Denied. “Username and password cannot be empty.” |
| A4 | Both filled, combination not valid | Denied. “Invalid credentials.” |

Test conditions listed: valid pair; blank username only; blank password only; both blank; valid username with invalid password; invalid username with valid password; both invalid.

Message text is exact. A3 includes the word “and”. A4 must stay generic: it must not say whether the username or the password was the bad field.

### UC-02 Search for Products

- Actor: logged-in user. Precondition: Search Products is visible.
- Goal: find products whose names contain the search text.
- Catalogue: Laptop, Smartphone, Headphones.
- Rules: case-insensitive; partial text matches; only matching names are shown; an empty search shows every product.

| Flow | Input | Required outcome |
| --- | --- | --- |
| Main | Text that matches | Only products whose names contain that text |
| A1 | Text that matches nothing | No products in the results list |
| A2 | Empty search field | All three products |

Test conditions: exact name; lower or upper case; partial text at the start of a name; partial text inside a name; text that matches more than one product; text that matches none; empty field.

Example in the rules: searching for “Laptop” shows Laptop only.

### UC-03 Add a Product to the Shopping Cart

- Actor: logged-in user. Precondition: Products section is displayed.
- Goal: add the selected product and keep the correct quantity.
- Main flow: select Add to Cart; product appears in Shopping Cart with quantity 1.
- A1: adding a product already in the cart keeps a single line and increases that quantity by 1.
- A2: before any add, the cart shows “Your cart is empty.”
- Rules: all three products can be added. First add sets quantity to 1. Repeat adds increment; they do not create a second line. Adding one product does not change another product’s quantity. The cart shows each product’s name and quantity.

Test conditions: empty cart; add each product once; add the same product twice; add the same product several times; add different products; confirm one product’s quantity does not affect another.

### UC-04 Remove a Product from the Shopping Cart

- Actor: logged-in user. Precondition: cart already contains at least one product.
- Goal: remove one unit of the selected product.
- Main flow: select Remove; that product’s quantity decreases by 1; the updated quantity is shown.
- A1: quantity 1, then Remove — the line disappears.
- A2: removing the last product shows “Your cart is empty.”
- Rules: Remove subtracts 1 from the selected product only. Quantity 0 is not displayed. Other products and their quantities stay unchanged.

Test conditions: remove one unit when quantity is greater than 1; remove a product whose quantity is 1; remove one product while others remain; remove the final product; confirm other products are unchanged.

## 7. Traceability

The handout includes an optional planning table: Use Case ID, Flow or Rule, Test Case ID, Expected Result. One row per condition is enough to show that every test case traces to a flow or rule before it is copied into the worksheet.

Suggested ID pattern if the assigned feature is tested in full:

| Use case | Natural test-case span | Bug IDs |
| --- | --- | --- |
| UC-01 | One case per row in section 6 (7 cases) | `B-00n` only for fails |
| UC-02 | 7 conditions | same |
| UC-03 | 6 conditions; “add each product once” may split into three cases | same |
| UC-04 | 5 conditions | same |

The worksheet’s printed rows will not cover a full use case. The instruction is to continue on another sheet, so the count of cases should follow the use case, not the number of blank rows.

## 8. Constraints that affect later testing

- Report a bug only when the app disagrees with the use case. The README warning that the app contains defects is not itself a finding.
- Login is a precondition for UC-02, UC-03, and UC-04. A login failure blocks those features; it is still a UC-01 defect if login is not the assigned feature only when the assigned scenario cannot be reached. The handout says to test the assigned feature.
- Expected messages are quoted strings. Wording, not just “some error appeared”, is the pass/fail check for login.
- Search matching is “name contains text”, case-insensitive, not exact-match-only and not fuzzy match beyond substring.
- Cart identity is by product. Quantity changes in place. Remove takes one unit, not the whole line, unless quantity is already 1.
- Evidence is required. On paper, describe where the bug is visible. A screenshot is the stronger option on a computer.
- Reflection answers are part of the submission, not optional notes.

## 9. Source-code review (static inspection only)

The React source was inspected, but the application was not started and no interactive tests were executed. These observations identify likely mismatches to verify during the assigned feature's run; they are not recorded as executed test results or submission-ready confirmed defects.

| Area | Source behavior observed | Use-case comparison | Follow-up during execution |
| --- | --- | --- | --- |
| Login | `handleLogin` grants access only for `admin` / `password`. For every other input, it displays `alert("Error")`; it does not distinguish blank username, blank password, both blank, or filled invalid credentials. | The four failure conditions require denial with four specified messages, including the generic “Invalid credentials.” | Run each UC-01 failure condition and record the visible alert text. Also confirm the successful welcome message. |
| Product search | `handleSearch` filters product names using lowercase substring matching. An empty query matches all three products. | This appears consistent with UC-02's case-insensitive, partial-match, no-match, and empty-query behavior. | Execute the UC-02 conditions in the UI and record results. |
| Add to Cart | First add creates quantity 1. Repeat adds update the matching product's quantity; other product entries are preserved. | This appears consistent with UC-03's quantity and product-isolation rules. | Execute UC-03 conditions in the UI, including repeated and mixed-product adds. |
| Remove from Cart | `handleRemoveFromCart` does not call `setCart` or otherwise update state. | UC-04 requires decrementing one unit, removing a quantity-1 line, and showing the empty-cart message when appropriate. | Execute UC-04 flows and capture the cart before and after pressing Remove. |

Static inspection cannot confirm the browser-visible behavior, evidence, or severity. The source suggests likely UC-01 and UC-04 failures, but only observed runs should be entered as failures in the worksheet.

## 10. Scope and remaining notes

- Yuandong confirmed that the submission should cover all four features. The merged worksheet intentionally includes UC-01 through UC-04, matching that requested scope.
- Section 9 was a static reading of the source, written before the executed worksheet. Section 11 records problems found when the merged worksheet was checked against the screenshots and the source.

## 11. Problems found in the merged worksheet

Current submission files, checked 19 Oct 2026:

- `CPRG-305-B/unit6/submission/Unit 6 Bug Hunt Worksheet - Yuandong Yang.html`
- `CPRG-305-B/unit6/submission/Unit 6 Bug Hunt Worksheet - Yuandong Yang.pdf` (16 pages, 16 embedded images after the fixes below)
- `CPRG-305-B/unit6/submission/evidence/` (6 login shots, 10 cart shots as 5 before-and-after pairs)
- `CPRG-305-B/unit6/export-pdf.cjs` (PDF export script)

The four earlier per-feature HTML and PDF files are gone. Counts in the merged file match the written summary: T-001 to T-028, with UC-01 at 1 pass / 6 fail (B-001 to B-006), UC-02 and UC-03 all pass, and UC-04 at 5 fails (B-007 to B-011). Part 3 cites B-010 for the last-item remove, and its 6 happy-path / 22 edge-case split matches T-001, T-008, T-017 to T-019, and T-024. The header contains the student name, student ID, email, and course line. Login and Remove screenshots still match the written actual results, and the source still agrees.

### 11.1 The PDF export script is not in the project

The handoff says to edit the HTML and then re-run `run/topdf.cjs` from the scratchpad. That script was not found in the repository search. The merged PDF on disk can be submitted as it is. A later edit to the HTML has no export script in the project to regenerate the PDF.

Status: fixed. `CPRG-305-B/unit6/export-pdf.cjs` exports the worksheet HTML to Letter-size PDF with the repository's Playwright install under `playwright/`. Run `node CPRG-305-B/unit6/export-pdf.cjs` from the repository root, or pass another HTML path as the first argument. The current PDF was produced with this script.

### 11.2 Some screenshots do not show the action that was tested

- Remove evidence is a still image of an unchanged cart. `evidence/UC04-T-001.png`, used for B-007 / T-024, shows `Laptop (x3)` and a Remove button. Because the defect is that nothing changes, that image looks the same before and after the click, so the picture alone does not prove Remove was selected. The same limit applies to B-008 through B-011. The written steps and the source both say the click has no effect. A before-and-after pair, or a shot that includes the click, would make the evidence stronger.
- Invalid-credential shots mask the password. `evidence/UC01-T-005-alert.png`, used for B-004 / T-005, shows username `admin`, a dotted password, and an alert that says `Error`. The image does not show whether the password was `wrongpass`. B-005 and B-006 have the same mask. Blank-field shots are clearer: `evidence/UC01-T-002-alert.png` (B-001) shows an empty Username and a filled Password, and `evidence/UC01-T-003-alert.png` (B-002) shows Username `admin` and an empty Password field, each with the same `Error` alert.

These are evidence limits. They do not contradict the Pass/Fail results recorded in the worksheet.

Status: fixed. All evidence was captured again on 19 Oct 2026. Each Remove report now shows the Shopping Cart section before and after the click. The cart is the same in both images, and in the after image the clicked Remove button is darker because the pointer is still on it. Login shots were taken with the Password field switched to plain-text display before Login was selected, so B-004 shows `wrongpass`, B-005 shows `password`, and B-006 shows `wrongpass`, each with the `Error` alert. The change affects display only, not the login check, and section 2.2 of the worksheet states this once.

### 11.3 Evidence filenames still use the old per-feature numbers

After the merge, worksheet IDs run T-001 to T-028 and B-001 to B-011. The image files were not renamed. `evidence/UC04-T-001.png` is the evidence for B-007, not for worksheet T-001, and `evidence/UC01-T-002-alert.png` is B-001. The HTML links point at the right files. A reader who matches the filename to the new test-case ID will attach the wrong case.

Status: fixed. Files are now named by worksheet bug and test-case IDs, for example `evidence/B-001-T-002-login-alert.png` and `evidence/B-007-T-024-cart-before.png` / `-cart-after.png`. The old `UC0x-T-00n` files were removed.

### 11.4 One evidence caption omits a line that is in the image

B-011 / T-028 says the cart still shows `Laptop (x2)` and `Smartphone (x3)`. The evidence sentence under that report mentions only `Smartphone (x3)`. `evidence/UC04-T-005.png` shows both lines, each with a Remove button. The image supports the actual result. The caption does not.

Status: fixed. The B-011 caption now names both lines, `Laptop (x2)` and `Smartphone (x3)`.

### 11.5 Layout notes from the deleted per-feature PDFs

An earlier visual pass of the four separate PDFs found two presentation issues: bug-report tables split across pages, and the UC-04 test-case header rendered “Status” and “Bug ID” very close together. Those four PDFs have been deleted. That pass was not repeated on the merged 13-page PDF, so those layout notes are not confirmed for the file that will be submitted.

Status: checked on the regenerated 16-page PDF. Each bug report sits on one page and no report table is split. The test-case table headers show Status and Bug ID as separate columns.


## 12. Review of the merged submission

Reviewed the merged deliverables dated 19 Oct 2026: `submission/Unit 6 Bug Hunt Worksheet - Yuandong Yang.html`, `submission/Unit 6 Bug Hunt Worksheet - Yuandong Yang.pdf`, and `submission/Unit 6 Activity Bug Hunt Adventure Worksheet - Yuandong Yang.docx`.

### 12.1 Content and evidence

The merged submission has 28 test cases with continuous IDs T-001 to T-028 and 11 reports with continuous IDs B-001 to B-011. The summary matches the test table: UC-01 has 1 pass and 6 fails; UC-02 has 8 passes; UC-03 has 8 passes; UC-04 has 5 fails. Each failed case links to its report, and the three reflection questions are answered. The header includes the supplied student name, ID, email, and course.

The newer UC-04 reports include before-and-after evidence pairs, which address the earlier concern that a still image of an unchanged cart did not show the attempted action. The UC-01 evidence also shows the typed credential values alongside the generic alert. The checked PDF screenshots agree with the recorded outcomes, and the inspected React source remains consistent with the observed login and remove behavior.

### 12.2 Assignment scope

The activity brief says each student tests one assigned feature. The merged worksheet tests all four features. The assigned feature is still not identified in the supplied materials, so this combined submission should be used only if the facilitator assigned all four features or explicitly permits a combined submission. If the assignment is for one feature, submit that feature's worksheet instead.

### 12.3 PDF page count and layout

The merged PDF currently has **16 pages**, not the 13 pages stated in the handoff. All 16 pages were rendered and visually inspected. The content and screenshots are legible, the tables are not clipped, and the earlier UC-04 table-header crowding is fixed. Some bug reports and reflection text continue on the following page, and several pages have substantial unused space; this is readable but explains the longer-than-reported page count. The DOCX includes Part 1's introductory material, while the merged PDF starts at Part 2. No comparison render of the DOCX was available because LibreOffice is not installed; its text and table contents were read from the DOCX package. The test run itself was not repeated during this review.
