# Unit 10 React Unit Tests — Document Analysis

## Review scope

Reviewed the activity brief, the supplied SimpleApplication project, the React source and test files, the submitted report, and the two evidence screenshots for Yuandong Yang's Unit 10 activity.

## Overall result

**Acceptable with minor testing-quality recommendations.** The run result, failure count, diagnosis, and evidence agree with the supplied project.

## Findings

### 1. Test results are reported accurately

The evidence shows 9 suites, 16 tests, 6 passing suites, 3 failing suites, 12 passing tests, and 4 failing tests. The report correctly explains that the four failures are two calculation scenarios duplicated in the aggregate `App.test.js` and in two standalone suites.

### 2. Root-cause diagnosis is correct

The failing query asks for a `spinbutton` with an accessible name matching `/input/i`, while `App.js` renders unnamed number inputs. The report correctly identifies the accessibility defect and gives two valid remediation paths. Adding real labels or accessible names to the inputs is the preferable product fix.

The report also correctly distinguishes the `act(...)` console warnings from test failures and notes that asynchronous data-loading tests should await the relevant state.

### 3. Test-strength observations

- `App.sumValuesIncorrect.test.js` only asserts that an incorrect value is absent. That can pass when the component renders no value at all, so it should be paired with a positive assertion for the expected value.
- The repeated calculation tests inflate the console failure count. A single source of truth for each scenario, plus a small aggregate smoke suite, would make defect triage clearer.
- The recorded use of `--watchAll=false` is appropriate for reproducible evidence; the explanation of interactive watch mode is also correct.

## Recommended follow-up

Add accessible labels to both number inputs, await all asynchronous effects consistently, strengthen negative assertions with positive checks, and remove or clearly justify duplicated suites. These recommendations do not invalidate the submitted analysis.

