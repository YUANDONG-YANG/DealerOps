# Frontend review (2026-09-28)

Reviewed `dealer-web/src` (Vue 3, Vue Router, Pinia, Element Plus, Axios). Entry is `dealer-web/src/main.ts`. Routes live in `dealer-web/src/router/index.ts`. `references/` was not treated as product UI. Tests, `node_modules`, and build output were not reviewed as source; imports were checked so test-only use is not called dead.

## Summary

| Category | High | Medium | Low |
| --- | --- | --- | --- |
| dead-code | 0 | 0 | 1 |
| duplication | 0 | 1 | 1 |
| design-pattern | 0 | 0 | 1 |
| correctness | 1 | 1 | 0 |

Six findings: 1 high, 2 medium, 3 low.

## Findings

### F-01 CRM link picker stops after the first server page
- Severity: high
- Category: correctness
- Location: `dealer-web/src/views/CrmView.vue` lines 115-152; `dealer-core/src/main/java/com/dealerops/core/common/Paging.java` lines 10-12; `dealer-core/src/main/java/com/dealerops/core/customer/CustomerService.java` line 55
- Evidence: `loadLinkOptions` requests `vehiclesApi.list({ page: 0, size: 50 })` and never walks further pages. `loadLinkedOwners` loops `while (page * 50 < total)` and calls `customersApi.list({ linked: true, page, size: 50 })`. `Paging.size` clamps every list to at most 10 (`Math.min(requested, 10)`), and customer list uses `Paging.of`. A requested size of 50 still returns one page of 10, and the loop stride of 50 then skips or stops. Vehicles past that page never appear in the link select, and links owned by customers past the first returned page are not marked taken.
- Direction: Page the vehicle and linked-customer walks with the size the server actually returns, and keep going until the accumulated count reaches `total`.

### F-02 Several failure branches always show the same copy
- Severity: medium
- Category: correctness
- Location: `dealer-web/src/views/DmsView.vue` line 148; `dealer-web/src/views/CrmView.vue` line 190; `dealer-web/src/views/AdminView.vue` lines 168-175, 188-200, and 220-227
- Evidence: DMS `openEdit` toasts `'Vehicle not found'` on both sides of the 404 check. CRM `openEdit` does the same with `'Customer not found'`. Admin create maps both `VALIDATION` / 400 and the final else to `'Check required contact fields'`. Bind maps both validation and the final else to `'Check username'`. Unbind maps both 404 and the final else to `'Member not found'`. A timeout or 500 is labeled as a missing record or a validation miss.
- Direction: Keep the documented code-specific strings, and give the remaining branch a generic failure string so it is not identical to the 400 or 404 case.

### F-03 Four copies of Axios error extraction
- Severity: medium
- Category: duplication
- Location: `dealer-web/src/api/http.ts` lines 53-64; `dealer-web/src/api/vehicles.ts` lines 3-9; `dealer-web/src/api/admin.ts` lines 34-42; `dealer-web/src/api/listings.ts` lines 84-134
- Evidence: `statusOf` / `codeOf` / `messageOf`, `errorStatus` / `errorCode`, `adminErrorStatus` / `adminErrorCode`, and `apiError` / `parseApiError` all read `response.status` and `response.data.code`. DMS and CRM import the vehicle helpers for customer and audit failures as well (`dealer-web/src/views/CrmView.vue` lines 11 and 57-80). Listings adds blob-body parsing because export uses `responseType: 'blob'`; the other copies do not.
- Direction: Keep one extractor on the shared Axios client, including the blob case, and delete the per-module copies.

### F-04 Audit summary redaction and audit table are copied
- Severity: low
- Category: duplication
- Location: `dealer-web/src/views/DmsView.vue` lines 63-70 and 310-319; `dealer-web/src/views/CrmView.vue` lines 48-55 and 334-343
- Evidence: `summaryText` is the same function in both views: copy the object, drop keys matching `/email|phone|address/i`, otherwise `JSON.stringify`. The audit `el-table` columns (Action, Actor, When, Summary) match line for line, with only the entity type differing (`VEHICLE` vs `CUSTOMER` at lines 104 and 103).
- Direction: Share the redaction helper and a small audit table component used by both drawers.

### F-05 Unused exports and an unused confirm-label alias
- Severity: low
- Category: dead-code
- Location: `dealer-web/src/api/http.ts` lines 53-56; `dealer-web/src/api/listings.ts` lines 41-47 and 119-121; `dealer-web/src/stores/session.ts` line 14; `dealer-web/src/components/ConfirmDialog.vue` lines 2 and 12
- Evidence: `messageOf` has no callers. `readyExportMessage` has no callers; views call `readyExportMessageAsync` (`dealer-web/src/views/AdsView.vue` lines 196 and 216). `CHECK_STATUS_LABEL` is only read inside `listings.ts`. The Pinia `signedIn` getter is never read (guards use `account()` and `role`). `confirmText` is never passed; parents pass `confirm-label` or neither.
- Direction: Remove the unused export, getter, and prop alias. Leave `readyExportMessageAsync`, which is the one Ads uses for blob errors.

### F-06 Role gate is copied in three places
- Severity: low
- Category: design-pattern
- Location: `dealer-web/src/router/index.ts` lines 33-44 and 96-104; `dealer-web/src/stores/session.ts` lines 14-15; `dealer-web/src/components/AppMenu.vue` lines 6-16
- Evidence: `hasBusinessAccess` is implemented twice: a router function and a session getter. The router never reads the getter. `AppMenu` inlines the same `Platform.Admin` versus `Dealer.User` plus non-null `dealerId` test to decide which links to render. The three copies match today.
- Direction: Read the session getter from the router and from the menu so a future role change is made in one place.

## Not flagged

- Routed views, `App.vue`, `main.ts`, layouts, and the shared components (`DataTable`, `FormDrawer`, `PageState`, `AdWorkspace`, `AssistantCard`, `AppMenu`) are all referenced. `styles.css` classes used in those templates are all referenced.
- No commented-out code blocks. `DataTable` `loading` and `pageSize` props have defaults and are used inside the component; callers rely on `PageState` and the default page size of 10, which matches `Paging.size`.
- A shared Axios client already exists (`dealer-web/src/api/http.ts`). Element Plus covers tables, forms, dialogs, and pagination; there is no local date or UI kit reimplementation.
- Admin member paging uses `size: 10`, which matches the server cap, so that loop was not treated as the CRM bug.
- CRM omits `status=IN_STOCK` on the link query. `design/13-Frontend-Engineering.md` line 179 says in-stock, while lines 177 and 243 say in-stock or sold. The code matches the later wording, so that was not called a contract bug.
- Admin Members empty copy is `No dealerships yet.` (`dealer-web/src/views/AdminView.vue` line 295). That string is the Admin empty state in `design/13-Frontend-Engineering.md` line 280, so it was not flagged as a broken state.
- `session.setProfile` treats `active === false` as no dealership (`dealer-web/src/stores/session.ts` line 20). `MeResponse` has no `active` field; the check only runs if a payload includes it, which `design/13-Frontend-Engineering.md` line 89 allows. `dealerId` still comes from `/me`, not from the client.
