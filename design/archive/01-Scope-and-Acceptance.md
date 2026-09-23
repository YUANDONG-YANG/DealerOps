> Superseded v1.0 historical draft. Do not implement from this document. Read the current document index in [README.md](README.md) for the 00 business design and the 07/08/09 microservice, DevOps, and AI component designs. The original requirements have been located and verified; they do not include a manufacturer portal or a buyer self-service site.

# Scope and acceptance

## Project goal

DealerOS helps a small dealership keep vehicle records, reconditioning work, advertisement checks, customer follow-up, and sale records in one system. The capstone deliverable should demonstrate the full business flow and explain why an advertisement was blocked or needs human review.

The demo scenario is an Ontario used-vehicle dealership selling ordinary in-stock cars, matching the original brief’s designation of OMVIC. It is not a commercial DMS covering every region, vehicle type, and transaction type.

## Roles and permissions

- Visitor: no account; views only published, available advertisements and submits an enquiry; cannot read customer records.
- Staff: views internal business data; creates and edits unsold vehicles; manages reconditioning work orders; edits advertisements; runs checks; maintains customers and leads; adds follow-ups.
- Manager: has Staff permissions, and may also mark a vehicle available, publish and unpublish advertisements, record a sale, archive a vehicle, and assign leads.

There are only two staff account roles. MVP internal data is shared; there is no multi-location or row-level sales-team isolation. The backend checks permission on each endpoint; hiding buttons in the UI is only a presentation aid.

Accounts are created by initialization: 1 Manager and 2 Staff. There is no open registration, email password reset, or complex user administration. Passwords are supplied through the deployment environment; the database stores only hashes.

## Required capabilities

### US-01 Login and access control

After staff sign in they enter the back office; after sign-out they cannot keep calling protected endpoints. Visitors cannot read back-office lists. Staff who call publish or sale endpoints directly must also receive 403.

### US-02 Vehicle inventory

Capture stock number, VIN, make, model, year, mileage, colour, base price, and mandatory fees, with search and status filters. Stock number and VIN are unique; amounts and mileage must not be negative. MVP supports one preset demo image; upload and AI photo retouching are not implemented.

Acceptance: create, view, and edit; duplicate VIN is rejected; business fields of a sold vehicle cannot be changed; inventory list data remains after refresh.

### US-03 Reconditioning work orders

An inventory vehicle may have multiple simple work orders. Fields include task, assignee, status, expected completion date, actual cost, and completion note. There is no labour billing, parts issue, or service-customer booking.

Acceptance: while any OPEN or IN_PROGRESS work order exists, the vehicle cannot be marked AVAILABLE. A vehicle that needs no reconditioning may have no work orders; a manager fills a ready note and then marks it available.

### US-04 Advertisement draft and automatic checks

Each vehicle has one current advertisement containing title, structured vehicle and price information, description, and a fixed disclosure area. Run a limited deterministic check and one AI text check; show results, locations, and suggested edits separately.

Acceptance: missing required fields or inconsistent prices are blocked reliably; when AI succeeds it returns a real suggestion; an AI timeout must not display “pass”; after the advertisement or related vehicle information changes, an old review result cannot be used to publish.

### US-05 Manager confirmation and on-site publish

The manager reads the current-version check results, handles or acknowledges findings, then publishes to this site. A fixed-rule BLOCK cannot be overridden. AI findings may be acknowledged, but a reason is required; when AI did not complete, the manager must explicitly acknowledge the degraded scope.

Acceptance: unpublished checks, stale checks, blocking results, and vehicles that are not ready cannot be published. The published vehicle page includes public vehicle information and the display price; it must not leak cost, customer data, or internal notes.

### US-06 Customer enquiry and follow-up

A visitor on an advertisement page enters name, at least one contact method, and a message. The system creates a customer and a lead on the related vehicle; staff may also enter leads manually. A lead supports an owner, stage, next follow-up date, and time-ordered follow-up notes.

Acceptance: after a successful enquiry the back office can find it; retrying the same request does not create a second record; unpublished or sold advertisements cannot accept a new enquiry; there are no customer accounts and no automatic emails.

### US-07 Sale and automatic wrap-up

The manager selects a valid lead and enters the final sale amount and a note. In one transaction the system creates a sale record, sets the vehicle to SOLD, unpublishes the advertisement, sets the selected lead to WON, sets the vehicle’s other unfinished leads to LOST with a reason.

Acceptance: if two managers submit the same vehicle, at most one sale succeeds; on failure the system must not update only part of the data. An MVP sale is a business record: no contract, no payment collection, no finance or tax invoice. The confirmation page states that this version does not support undo after submit; incorrect demo data is restored by a development-environment reset.

### US-08 Simple statistics

The dashboard shows available vehicle count, open reconditioning work-order count, open lead count, this month’s sale count, and recorded sale amount total.

Acceptance: after one sale the metrics match the sales list. The amount total is registered sale amounts, not profit, cash received, or a tax-inclusive total.

## Deferred features

Image Studio, photo upload, OCR, external VIN decode, vehicle-history lookup, third-party advertisement sync, full loan and lease, payments, contract e-sign, multi-store, SMS/email, customer accounts, complex BI, native mobile apps, vector stores, and model training are all out of this version.

There is no extra hardware, live price scraping, or real dealer-system integration. The only planned external business API is one AI text service; development and the baseline flow continue through an identifiable mock and fixed rules.

## Minimum success criteria

1. US-01 through US-08 are all demonstrable; at least one end-to-end path from intake to sale passes.
2. There is evidence of a real AI call and a fixed-sample evaluation; an offline mock only proves integration, not completion of real-AI acceptance.
3. Four exception classes are handled correctly: publish with a stale review, unauthorized publish, duplicate sale, and AI timeout.
4. Data survives restart; another teammate can run the project from the README.
5. The client accepts the limited rules and proposed scope; course-required reports, demo, and individual contribution records are completed separately against the rubric.

## Non-functional goals

- Demo scale: at most 500 vehicles, 2,000 leads, 10 concurrent users; this is a design target, not a measured result.
- Routine list/save target: p95 no more than 2 seconds in the team’s shared test environment; AI calls are timed separately.
- AI request cap 15 seconds, no automatic retry; after timeout keep the fixed-rule results and show the degraded status.
- Main back-office pages target desktop; public vehicle pages and the enquiry form adapt to phones; English UI, clear field errors, and keyboard focus.
- Data persistence, server-side permission checks, password hashing, server-side input validation; logs must not record customer contact details or API keys.

## Scope-change rule

Any new feature must first state which item it replaces, or how much extra time it adds. “Looks simple” is not enough to join the MVP. Prefer transaction consistency, explainable checks, and a complete demo.
