> Superseded v1.0 historical draft. Do not implement from this document. Read the current document index in [README.md](README.md) for the 00 business design and the 07/08/09 microservice, DevOps, and AI component designs. The original requirements have been located and verified; they do not include a manufacturer portal or a buyer self-service site.

# API contract

This is a pre-coding REST contract draft. When OpenAPI is generated later, keep these fields and error semantics. Do not maintain a second YAML that can drift in this stage.

## Common rules

Prefix /api/v1. Path IDs and JSON IDs are strings; amounts are two-decimal strings; times are ISO-8601 UTC; JSON uses camelCase. Database field mapping is in the data dictionary.

A successful single object returns the DTO directly; lists return {items,page,size,total}, page starting at 0. POST create returns 201; successful actions 200; logout 204. Errors are uniform:

```json
{"code":"CHECK_STALE","message":"The advertisement changed. Run checks again.","fieldErrors":{},"requestId":"server-generated-id"}
```

400: format or field validation; 401: not signed in; 403: insufficient permission / CSRF failure; 404: no such object; 409: state / version / unique-constraint conflict; 429: rate limit; 500: unexpected service error. Do not expose SQL, stacks, or raw AI errors to users.

All PATCH use a whitelist DTO and do not accept arbitrary entity properties. Staff cannot bypass action endpoints by patching role, publishedBy, stage=WON, or vehicle.status=SOLD. Public and internal DTOs are separate.

Below, M means Manager, S means Staff or Manager, P means public. Write endpoints require CSRF except public enquiry; login also uses CSRF. Public enquiries do not depend on a session; they use rate limiting and server-side validation.

## Authentication

- GET /auth/csrf · P → {token,headerName}. Response must not be cached.
- POST /auth/login · P, {email,password} → {id,displayName,role} and a session cookie; failure is a generic 401.
- GET /auth/me · S → current user; no session is 401.
- POST /auth/logout · S → 204, invalidate the session.
- GET /users/options · S → {id,displayName,role} list of active users for work-order and lead assignment; do not return email or password hashes.

## Inventory and work orders

- GET /vehicles?query=&status=&page=0&size=20 · S → vehicle summary list; default newest created first.
- POST /vehicles · S, {stockNo,vin,make,model,modelYear,mileageKm,color,basePrice,mandatoryFeeTotal,photoKey,internalNote} → vehicle detail; creates an empty advertisement in the same transaction. photoKey may only be a backend-allowed preset image; unknown keys are rejected.
- GET /vehicles/{id} · S → vehicle fields, advertisedPrice, version, listingId, listingStatus, contentVersion.
- PATCH /vehicles/{id} · S, {version, allowed vehicle fields} → updated detail. VIN/stockNo may be corrected while unsold, still under unique constraints; status cannot be edited directly.
- POST /vehicles/{id}/mark-available · M, {version,readyNote} → vehicle; active work orders return OPEN_WORK_ORDERS.
- POST /vehicles/{id}/return-to-preparation · M, {version,reason} → vehicle and unpublish; reason is written to audit.
- POST /vehicles/{id}/archive · M, {version,reason} → archive; unfinished work orders or leads return ACTIVE_DEPENDENCIES.
- GET /work-orders?vehicleId=&status=&assignedTo=&page=0 · S → work-order list.
- POST /vehicles/{id}/work-orders · S, {title,description,assignedTo,dueDate} → OPEN work order; not PREPARING returns VEHICLE_NOT_PREPARING.
- PATCH /work-orders/{id} · S, {version,title?,description?,assignedTo?,dueDate?,actualCost?} → work order; terminal states are not editable.
- POST /work-orders/{id}/transition · S, {version,toStatus,completionNote?} → work order; DONE requires completionNote.

Every work-order response includes vehicleId, vehicleStockNo, version, and the data-dictionary fields. Terminal vehicles cannot add work orders or change business data.

## Advertisements and checks

- GET /vehicles/{id}/listing · S → {id,vehicleId,title,description,scopeConfirmed,status,contentVersion,version,preview,latestCheck,publication}.
- PATCH /listings/{id} · S, {version,title,description,scopeConfirmed} → update advertisement; save voids related reviews and unpublishes when needed.
- POST /listings/{id}/checks · S, {contentVersion} → 201 check result; wait up to 15 seconds for the AI request plus local processing; client timeout 20 seconds. Version already mismatched is 409; a change during the run marks the result stale=true.
- GET /listings/{id}/checks?page=0 · S → check history for this advertisement only.
- POST /listings/{id}/publish · M, {version,contentVersion,checkId,acknowledgedFindingIds,acknowledgeAiUnavailable,reviewNote} → current advertisement status. reviewNote may be empty when there are no findings and AI is SUCCESS; findings or degradation require it.
- POST /listings/{id}/unpublish · M, {version,reason} → DRAFT; only the current PUBLISHED listing is accepted.

Check response example (rule IDs are defined in document 05):

```json
{
  "id":"41","listingId":"12","contentVersion":3,"stale":false,
  "ruleVersion":"demo-1","ruleStatus":"BLOCKED",
  "findings":[{"id":"R04","ruleId":"R04","severity":"BLOCK","field":"renderedPrice","message":"Advertised price does not match the calculated total."}],
  "aiStatus":"UNAVAILABLE","aiFindings":[],"durationMs":15000
}
```

When there is no BLOCK, ruleStatus=NO_BLOCKERS; this is not a full compliance certification. AI finding ids are generated by the server for that check. Publish must acknowledge every REVIEW finding id on that check; AI unavailable must be acknowledged explicitly. MOCK checks cannot be published in a real demo/production configuration; a local demo profile may publish but the public page shows a Demo review mark.

## CRM

- GET /customers?query=&page=0 · S → paginated {id,name,email,phone,version} for choosing an existing customer.
- PATCH /customers/{id} · S, {version,name,email,phone} → customer; at least one contact method.
- GET /leads?vehicleId=&stage=&ownerId=&overdue=&page=0 · S → lead summary list.
- POST /leads · S, {vehicleId,customerId?,newCustomer?,message} → lead. Exactly one of customerId or newCustomer; newCustomer is {name,email,phone}. Vehicle must be AVAILABLE; new customer and lead are created atomically; source=MANUAL and stage=NEW are set by the backend.
- GET /leads/{id} · S → lead, customer, vehicle summary, version, activities.
- POST /leads/{id}/assign · M, {version,ownerId} → lead; ownerId may be null; assign only active accounts.
- POST /leads/{id}/transition · S, {version,toStage,reason?} → lead; LOST or a stage rollback requires reason; setting WON directly is rejected.
- POST /leads/{id}/activities · S, {version,channel,note,nextFollowUpAt} → 201 activity with leadVersion; atomically updates follow-up date and lead.version. nextFollowUpAt may be null to clear; a past date is allowed to record an overdue task.

Ordinary PATCH does not allow changing lead.vehicleId/customerId, so follow-up history cannot jump to another vehicle or customer. To change the vehicle of interest, create a new lead and close the old one as appropriate.

## Sales and statistics

- POST /sales · M, {leadId,vehicleVersion,leadVersion,finalPrice,note} → 201 {id,vehicleId,leadId,finalPrice,soldAt}. The server derives vehicle/customer from the lead and does not accept an arbitrary frontend pairing.
- GET /sales?month=2026-11&page=0 · S → sale summaries; month is converted from dealer-local month to UTC query bounds.
- GET /sales/{id} · S → sale snapshot and related summaries.
- GET /dashboard · S → {availableVehicleCount,openWorkOrderCount,openLeadCount,currentMonthSalesCount,currentMonthSalesAmount,followUps,workOrders}.

A duplicate sale returns 409 VEHICLE_NOT_AVAILABLE or SALE_ALREADY_EXISTS; the client prompts a Sales refresh and confirmation. Do not auto-retry to create a new transaction. Sale insert and all related status updates complete in one database transaction.

## C-side public API

- GET /public/listings?make=&minPrice=&maxPrice=&page=0&size=20 · P → safe DTO; only visible advertisements; default newest published first.
- GET /public/listings/{id} · P → {id,title,description,make,model,modelYear,mileageKm,color,photoUrl,advertisedPrice,priceDisclosure,dealerName,dealerContact,reviewLabel}.
- POST /public/listings/{id}/enquiries · P, {submissionKey,name,email,phone,message,website} → 201 {message:"Your enquiry has been received."}; a duplicate key returns the same generic confirmation. website is a hidden anti-spam field that a normal user leaves empty.

Public DTOs exclude VIN, internal cost, readyNote, customers, staff, audit records, and raw AI suggestions. Public pages read the reviewed snapshot and must verify listing=PUBLISHED, vehicle=AVAILABLE, and a valid published version. Invisible details are always 404; enquiry state change uses 409 LISTING_UNAVAILABLE.

Public list/detail set Cache-Control: no-store so a sold vehicle is not still shown from cache during a demo. C-side pages refetch when the browser returns to the foreground; enquiry submit always re-checks on the server.

## Interface completion requirements at coding time

Every endpoint must have a role, input validation, a response DTO, and status errors; the frontend must not depend on serializing database entities. Change this file first, then notify the people owning the page and the backend together. Actual OpenAPI is generated from controllers and DTOs during coding and compared against this contract.
