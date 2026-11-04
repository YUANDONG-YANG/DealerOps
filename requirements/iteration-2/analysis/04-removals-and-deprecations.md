# Removals, deprecations, and deferred scope

Source: `requirements/iteration-2/Changes Document.docx` (body text only). The file has no tracked changes and no comments. Embedded screenshots have empty descriptions, so this note does not treat them as extra requirements.

The document never uses the words deprecate, sunset, migration, or out of scope. Removals below are only statements that drop, replace, or hold back something that exists or that the text itself proposes. Wording strength is kept as written: a client request is stronger than an author line that says "I suggest" or "I feel."

## Explicit removals

### Home page Create Account button

**Section:** Client Requests.

**Removed:** The button to create an account on the home page. The document elsewhere refers to "any of the create account options" on the home page, so the removal covers every such option.

**Replacement stated:** The client asked that home-page create-account functionality be converted into a way for dealerships to inquire and potentially use the service. The same passage says the client also talked about doing account creation a different way, and that this needs further discussion. The interim instruction is explicit: "For now, removing the button to create account from the home page will suffice."

**Compatibility note the document gives:** Remove the home-page button now. It does not specify the inquiry form, the later account-creation design, or what happens to people who already started sign-up. It does not remove staff-account creation under platform admin, or profile editing. Those screens are still named later as places to fix full-name handling. It also does not say to remove a sign-up page. A later suggestion says home-page sample ads should link to the sign-up page (see replaced flows). The document does not reconcile that suggestion with removing the home-page create-account button.

### DMS Make and Model search boxes

**Section:** Site Fixes and Changes. Author suggestion ("I suggest").

**Removed:** The "Make" and "Model" boxes on DMS search.

**Replacement stated:** The existing "Search VIN, make, or model" box. The reason given is that Make and Model repeat that search in a worse format.

**Compatibility note:** None. The document does not say to drop make or model as stored vehicle attributes. In the same passage, the Year box is kept and turned into a typeable box, and a Stock # search box is added. Those are changes, not part of this removal.

### Full-name uniqueness block

**Section:** Site Fixes and Changes. Labeled as a fix.

**Removed:** The rule that blocks account creation when the full name is already used. The reason given is that many people share a name.

**Replacement stated:** None. Shared full names must be allowed.

**Places named:**

- Home page, any create-account option
- Platform admin > Dealerships > Staff > Create new staff account
- Any account > Profile

**Compatibility note:** The author says these three places were found and there may be more. No data change for existing accounts is described. The home-page create-account path is also covered by the button removal above. The staff-create and Profile places stay in scope for this fix.

### Customer phone-number exclusivity

**Section:** Site Fixes and Changes. Author suggestion ("I feel they shouldn't be").

**Removed:** The rule that customer phone numbers are exclusive.

**Replacement stated:** Separate customer profiles may share a phone number, because some people share a number.

**Where it applies:** Regular customer creation and customer creation through the leads page. The location line is: any user account > CRM > Add customer + Edit.

**Compatibility note:** None for existing rows. This is separate from the duplicate warning in the same paragraph. That warning covers name, email, phone, or address: tell the user a customer with that value already exists and ask them to confirm before creating another. Phone is the only field the document describes as exclusive today, and the author feels that exclusivity should stop. Name, email, and address are named only for the duplicate warning.

## Replaced flows and replaced presentation

### Platform admin direct bind, replaced by a join request

**Section:** Site Fixes and Changes ("should not be able").

**Removed:** The platform admin ability to directly bind accounts to dealerships.

**Replacement stated:** The platform admin may only send a join request to the dealership.

**Why:** Security. The client asked that a platform admin not be able to create an account and then access a dealership's customer and vehicle database.

**Compatibility note:** None. The document does not say what happens to accounts that are already bound, or how an in-progress direct bind is treated.

### CRM "vehicles purchased" column

**Section:** Site Fixes and Changes. Author suggestion ("I would suggest replacing").

**Removed from the CRM view:** The vehicles purchased column. The reason given is that a purchase count is not very useful because people buy few vehicles.

**Replacement stated:** Leads for the customer.

**Where:** Any user account > CRM.

**Compatibility note:** None. The document does not say to delete purchase history. It only replaces this column in the CRM view.

### Home page sample ads

**Section:** Site Fixes and Changes. Author suggestion ("I believe").

**Replaced:** Sample ads on the home page currently link to the sign-in page. They should link to the sign-up page, because people who click the ads are potential users.

**Compatibility note:** None. See the create-account button note above; the document does not say whether the sign-up page remains the public registration flow after that button is removed.

### Shop page wording "used"

**Section:** Site Fixes and Changes.

**Removed:** The word "used" on the dealership shop page. The reason given is that many dealerships hold and sell new vehicles.

**Replacement stated:** No replacement wording.

**Where:** Home page > shop vehicles.

### "Display name" listed as "full name"

**Section:** Site Fixes and Changes. Labeled as a fix.

**Replaced label:** "Display name" should be listed as "full name" on Profile and when creating a staff account through the admin page.

**Compatibility note:** This is a label change. The document does not say to drop the name value or the field.

## Dropped fields

The document does not drop a stored field by name.

The closest presentation and search drops are:

| Item | What the document does | Stored data |
| --- | --- | --- |
| CRM vehicles purchased column | Replace the column with leads for the customer | Not described as deleted |
| DMS Make and Model boxes | Remove those search boxes; keep "Search VIN, make, or model" | Make and model attributes are not dropped |
| Shop page "used" | Stop using that word | No field named |
| Display name | List it as full name | Name value is not dropped |

## Dropped roles

No existing role is removed.

The document still refers to platform admin, manager, dealership staff, any signed-in user, and a user who is not logged in. The dealership admin / owner / regional manager line below is a proposed optional role, not a role being retired. The document spells the last word "manger" in the role sentence and "manager" in the privilege list.

## Deferred and optional scope

These are the closest "not now" statements. They are not removals of current behavior.

### Account creation done a different way

The client discussed a different account-creation approach. The document says the team needs to discuss it further with the client. Until then, the only instructed action is removing the home-page create-account button. The document does not define the replacement process.

### Dealership admin / owner / regional manager account

Discussed with the client as a dealership-specific account with some admin capabilities for a single dealership, similar to the platform admin account but limited to that dealership. The document says: "This functionality is optional and should likely be discussed further with the client before full implementation occurs."

Privilege order given with that idea, from most to least:

1. Platform admin
2. Dealership admin / owner / regional manager
3. Dealership manager
4. Dealership staff
5. User not logged in

**No longer deferred.** On 2026-11-03 this was decided and implemented as a single dealership **Owner** tier, so `DealerRole` is now `{ Owner, Manager, Sales }` and the ladder is Platform admin, Owner, Manager, Sales (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md`). The "dealership staff" level is the same level, renamed Sales; no level was dropped.

### Model-year list, reduced if full coverage is too hard

For the Add Vehicle model-year control, the author suggests listing only years that the selected vehicle can use. If that is too hard for every vehicle, the suggestion is to do it only for common vehicles. The control stays. This is a smaller scope for a new filter, not a removal of model year.

## Not removals

Included so later synthesis does not treat new delete actions or tighter rules as retired features.

- **New delete actions.** Admins should be able to remove pending accounts. Platform admin should be able to delete dealerships, with at least one extra confirmation. Admins should be able to delete users, with at least one extra confirmation, and should be able to edit some account information such as email or phone. These add actions.
- **Join requests stay.** They should be split into a table of current requests to approve or reject, and a table of past requests that were approved or rejected. Logged-in path named for the split: manager > Team > Join requests. The sortable-columns list names any user account > Team > Join Requests; the document does not reconcile the two.
- **Duplicate-customer warning still allows create.** A matching name, email, phone, or address should prompt for confirmation. Phone exclusivity is the only rule in that paragraph that the author says should end.
- **Closed leads stay in the product.** Closing a lead should ask for confirmation. Closed leads should be reopenable. Leads should be tied to vehicle sales: when a vehicle is sold to a customer, the leads are closed automatically, with the appropriate label applied to the customers tied to the lead. The document does not say which leads are in scope beyond that, for example other customers' leads on the same vehicle. Duplicate leads with the same customer and vehicle should not be created.
- **New sale and vehicle rules.** A sale should require a linked customer, or "other" plus a typed buyer. VINs should be forced to match DMS vehicle information. The Carfax URL box should be exclusive and should require an actual Carfax link before save.
- **Search controls that stay, with edits.** The DMS Year box becomes typeable. The Add Vehicle brand dropdown is split, not removed. Customer and Vehicle of interest boxes stay and should work more like the leads menu. Activity-log search is extended (including partial match and search by the change made). Column and search-option order is aligned. None of these are stated as removals.

## Deprecation and migration language

There is no deprecation window, feature flag, version note, or data-migration step.

The only interim instruction is for the home-page create-account button: remove it now, and leave the different account-creation approach for a later client discussion.
