# Changes to existing behavior

Source: `requirements/iteration-2/Changes Document.docx`.

This note covers only changes to behavior the document treats as already present. It uses the document’s own wording. It does not check the running application. Embedded screenshots are not transcribed. Where the document never describes the previous behavior, the entry says **old behavior not stated**.

The document has two sections:

- **Client Requests** — urgent, and to be done first.
- **Site Fixes and Changes** — less urgent, and still to be implemented, especially items marked as fixes. Several of these are the author’s suggestions (“I suggest”, “I feel”).

The author says the full-name places may be more than the three found, that the search-box list may not be complete, and that extra sortable columns beyond the written list are allowed. The confirmation-screen list carries no such caveat.

## Home page and public shop

### Remove the home-page create-account button

- **Section:** Client request. The interim step toward the requested dealership inquiry.
- **Old behavior:** The home page has create-account functionality. One of the three places named for the duplicate-full-name block is “clicking any of the create account options” on the home page.
- **New behavior:** Remove the create-account button from the home page. That is the change the document says will suffice for now.
- **Who:** Home-page visitors who would use create account. The home page has more than one create-account option ("any of the create account options"); the removal covers each of them.
- **Conditions / exceptions:** Converting that control into a way for dealerships to inquire is a direct client request. Only doing account creation a different way needs further discussion with the client. Removing the button is the interim change. See the pointer list.

### Sample ads link to sign-up

- **Section:** Site change.
- **Old behavior:** The sample ads on the home page link to the sign-in page.
- **New behavior:** Link them to the sign-up page. The stated reason is that people who click the ads are potential users.
- **Who:** Home-page visitors.
- **Conditions / exceptions:** None stated.

### Say the home page is for dealerships

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** Put something larger on the home page saying that the page is for dealerships and not for customers.
- **Who:** Home-page visitors.
- **Conditions / exceptions:** The wording is not specified.

### Shop page should not say “used”

- **Section:** Site change.
- **Old behavior:** The dealership shop page says “used”.
- **New behavior:** It should not say “used”, because many dealerships hold and sell new vehicles.
- **Who:** Home page > shop vehicles.
- **Conditions / exceptions:** Replacement wording is not specified.

### Show address and contact on each shop-page dealership

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** List each dealership’s address and some contact information on the shop page.
- **Who:** Home page > shop vehicles.
- **Conditions / exceptions:** Which contact fields are not specified. A dealership search on this page is a new capability (pointer list).

### Back button on the dealership buyer site

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** The dealership buyer site should have a back button.
- **Who:** Home page > shop vehicles > any dealership.
- **Conditions / exceptions:** The destination is not specified. Searching that dealership’s inventory is a new capability (pointer list).

### Show the ask-about-vehicle character limit as it gets closer

- **Section:** Site change.
- **Old behavior:** old behavior not stated. The request assumes a character limit on the question.
- **New behavior:** When asking about a vehicle, the character limit should be visible when it becomes closer.
- **Who:** Home page > Shop vehicles > any dealership > Ask about this vehicle.
- **Conditions / exceptions:** “Closer” is not defined as a count or a percentage. The limit value is not stated.

## Account identity

### Same full name must not block an account

- **Section:** Fix. The document says there may be more places than the three found.
- **Old behavior:** An account cannot be created if the full name is already used. People who share a name cannot have an account under the current system.
- **New behavior:** Fix that restriction so people with the same name can have an account. The replacement uniqueness rule is not stated.
- **Who:**
  - Home page, any create-account option (that entry is also requested for removal above).
  - Platform admin > Dealerships > Staff > Create new staff account.
  - Any account > Profile.
- **Conditions / exceptions:** Profile is named as a place where this occurs. The document does not say whether Profile is creating an account or editing a name.

### Call display name “full name”

- **Section:** Fix.
- **Old behavior:** The label in use is display name. The document says it should be listed as full name.
- **New behavior:** List it as full name on Profile and when a staff account is created through the admin page.
- **Who:** Any account on Profile; platform admin creating a staff account.
- **Conditions / exceptions:** None stated.

### Readable error for an invalid staff username

- **Section:** Fix.
- **Old behavior:** Creating a staff account for a dealership and typing a username with incorrect characters returns an error that is difficult to read.
- **New behavior:** Fix that error. The new message and the allowed characters are not stated.
- **Who:** Platform admin > Dealerships > Staff.
- **Conditions / exceptions:** None stated.

## Managers, membership, and platform-admin account binding

### Managers promote staff and edit some employee information

- **Section:** Client request.
- **Old behavior:** old behavior not stated.
- **New behavior:** Manager accounts may promote other staff to managers, and may edit certain employee information.
- **Who:** Dealership manager accounts, and the staff they promote or edit.
- **Conditions / exceptions:** “Certain employee information” is not listed. A dealership admin / owner / regional manager tier is optional and is not this change (pointer list). **Settled 2026-11-03:** that tier was built as the Owner role, the editable fields are full name and phone, and a manager may promote or edit **sales** members only (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md`).

### Members column for when the member joined

- **Section:** Client request. The sortable-column list uses the same column.
- **Old behavior:** old behavior not stated.
- **New behavior:** The members section gains a column listing when the member joined. On Team > Members the sortable name is Date Added (when added), together with Role and Source.
- **Who:** Any logged-in user > Team > Members.
- **Conditions / exceptions:** The platform-admin Members sortable list is Dealership, Role, Sign-in, and Status. The document does not add a join date there.

### Platform admin sends a join request instead of binding an account

- **Section:** Site change.
- **Old behavior:** old behavior not stated. The document states the rule to put in place and the access it is meant to stop.
- **New behavior:** The platform admin must not directly bind accounts to dealerships. The platform admin may only send the join request to the dealership. The stated reason is to stop a platform admin from creating an account that can open a dealership’s customer and vehicle database. The document says the client asked that platform admins not be able to do that.
- **Who:** Platform admin; the dealership that receives the join request.
- **Conditions / exceptions:** None stated.

### Remove or correct a pending account

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** Admins can remove pending accounts. Admins can edit a pending account, with email, phone, and username given as examples, when account-creation information was entered incorrectly.
- **Who:** Platform admin > pending accounts.
- **Conditions / exceptions:** The examples are email, phone, and username. The document does not list every editable field, and it does not say editing is forbidden when the original input was intentional.

### Delete a dealership, with an extra confirmation

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** Platform admin can delete a dealership. Deletion is a more complex decision and requires at least one extra confirmation step.
- **Who:** Platform admin > Dealerships > Edit.
- **Conditions / exceptions:** At least one extra step. What that step contains is not specified.

### Delete a user, with an extra confirmation, and edit some account fields

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** Admins can delete users, with at least one extra confirmation step. Admins can edit some account information, such as email or phone number.
- **Who:** The document says “Admins” and does not name a screen. The surrounding items are platform-admin actions.
- **Conditions / exceptions:** At least one extra confirmation for delete. The edit examples are email and phone number.

## DMS inventory, add vehicle, and selling

### Sold by, Sold to, and Date sold columns

- **Section:** Client request.
- **Old behavior:** old behavior not stated. The request is that the DMS page contain more columns.
- **New behavior:**
  - Sold by — who sold the vehicle.
  - Sold to — the customer who bought the vehicle.
  - Date sold — the day the vehicle was sold.
- **Who:** The DMS page. The document does not name a role on this request. Other DMS sorting is for any logged-in user.
- **Conditions / exceptions:** Where the columns go is only in screenshots (“Where columns should go”), not in the written text. These three columns are not in the DMS sortable list.

### Sell-vehicle menu shows cost, work-order spend, and list price

- **Section:** Client request.
- **Old behavior:** old behavior not stated. The request is that more information be presented in that menu.
- **New behavior:** When the sell vehicle action is clicked, add cost, total number spend on work orders (the document’s wording), and list price.
- **Who:** Whoever opens the sell-vehicle action. Role not named. The menu itself is only in a screenshot (“Menu in reference”).
- **Conditions / exceptions:** None stated. Linking the sale to a customer is a separate rule below.

### A sale must link to a customer, or to Other

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** The author suggests (“I suggest”) that a vehicle cannot be sold until the sale is linked to a customer. The user can pick “other” and type a buyer manually.
- **Who:** Users selling a vehicle. Role not named.
- **Conditions / exceptions:** “Other” plus a manually typed buyer is the stated alternative to an existing customer.

### Remove the DMS Make and Model boxes

- **Section:** Site change, author suggestion (“I suggest”). The author says the box list may be incomplete.
- **Old behavior:** DMS has Make and Model boxes. A “Search VIN, make, or model” box already provides the same functionality in a better format.
- **New behavior:** Remove the Make and Model boxes.
- **Who:** DMS search. Role not repeated on this bullet. DMS sorting is described for any logged-in user.
- **Conditions / exceptions:** The combined VIN / make / model search remains.

### DMS Year becomes a typeable box

- **Section:** Site change, author suggestion (“I suggest”).
- **Old behavior:** The Year box lists many years and is difficult to use.
- **New behavior:** Turn it into a typeable box.
- **Who:** DMS.
- **Conditions / exceptions:** None stated.

### Split the Add Vehicle brand list

- **Section:** Site change, author suggestion (“I suggest”).
- **Old behavior:** The Add Vehicle dropdown is difficult to use because of its size.
- **New behavior:** Split it into two sections, one for major brands and one for every brand, similar to Autotrader. The comparison is in screenshots.
- **Who:** Users adding a vehicle. Role not named.
- **Conditions / exceptions:** Which brands are “major” is not written out.

### Model years follow the selected vehicle

- **Section:** Site change.
- **Old behavior:** The model year dropdown is difficult to use because of its size.
- **New behavior:** If possible, list only model years the selected vehicle can be used with. If that is too hard for every vehicle, do it only for common vehicles.
- **Who:** Add-vehicle flow.
- **Conditions / exceptions:** The fallback is common vehicles only. “Common” is not defined. The document does not say what the year list is for other vehicles under that fallback.

### Move the VIN box to the top

- **Section:** Site change, author suggestion (“I would also suggest”). It follows the model-year sentence and shares a sentence with the open-work-order search suggestion.
- **Old behavior:** old behavior not stated.
- **New behavior:** Move the VIN box to the top.
- **Who:** Ambiguous. The text does not say whether this is the VIN box in the DMS search options or the one in the Add Vehicle form; both exist. Reading it as the Add Vehicle form follows the surrounding brand and model-year sentences and is an inference.
- **Conditions / exceptions:** “The top” is not tied to a named form section. Confirm which box is meant.

### VIN must match the vehicle information

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** VINs should be forced to match vehicle information on the DMS page.
- **Who:** DMS. Role not named.
- **Conditions / exceptions:** The checks inside “match vehicle information” are not specified.

### Carfax URL must be exclusive and a real Carfax link

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** The Carfax URL box in DMS should be exclusive, and it should require an actual Carfax link before the information is saved.
- **Who:** Users saving DMS vehicle information.
- **Conditions / exceptions:** “Exclusive” is not defined. What counts as an actual Carfax link is not specified.

### Customer and Vehicle of interest match the leads menu

- **Section:** Site change.
- **Old behavior:** Those boxes exist and are described as confusing and difficult to use. The text does not name the page; the accompanying screenshot shows the Add lead form.
- **New behavior:** Make them similar to the leads menu. The target pattern is a screenshot of the Leads list search suggestions and is not described in text.
- **Who:** Users adding or editing a lead, per the screenshot. The text names no role.
- **Conditions / exceptions:** The screen is identified only by the screenshots.

## Sales report and dashboard

### Current day, week, month, year, and sales-employee metrics

- **Section:** Client request.
- **Old behavior:** old behavior not stated. The request is that the sales report page contain more information, and that the same information appear in the dashboard sales section.
- **New behavior:** Sales information for the current day, week, month, and year, each listed as an option, on the sales report and in the sales section of the dashboard. Also a list of all sales employees and their sales metrics.
- **Who:** Not named. Surfaces are the sales report page and the dashboard sales section.
- **Conditions / exceptions:** The metrics are not listed. The periods named are the current day, week, month, and year.

## CRM customers

### Replace vehicles purchased with the customer’s leads

- **Section:** Site change.
- **Old behavior:** CRM has a vehicles purchased column. The document says the count is less useful because many people buy only a handful of vehicles.
- **New behavior:** Replace that column with the leads for the customer.
- **Who:** Any user account > CRM.
- **Conditions / exceptions:** Whether the replacement is a count, a list, or a link is not specified.

### Customer phone numbers are not exclusive

- **Section:** Site change.
- **Old behavior:** Phone numbers are exclusive for customers.
- **New behavior:** The author feels (“I feel”) they should not be exclusive. The stated reason is that some people share a phone number and may want separate customer profiles.
- **Who:** Regular customer creation, customer creation through the leads page, and the location line Any user account > CRM > Add customer + Edit.
- **Conditions / exceptions:** The document applies this both to regular customer creation and to customer creation through the leads page.

### Warn before creating a customer that matches name, email, phone, or address

- **Section:** Site change, same location as the phone rule.
- **Old behavior:** old behavior not stated for name, email, and address. Phone exclusivity is the separate rule above. The document does not say creation is blocked today when name, email, or address match.
- **New behavior:** If the name, email, phone, or address is the same as an existing customer, show a notification similar to “a customer with this name/email/phone/address (based on what it is) already exists, are you sure you would like to create a new customer” before allowing creation.
- **Who:** New-customer creation, including creation through the leads page. The location line also includes CRM edit.
- **Conditions / exceptions:** The message names the field that matched. The user can continue and create the customer. The document describes the prompt for creating a customer. It includes Edit in the location line and does not restate the prompt for edit.

## Leads

### Owner defaults to the person creating the lead

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** On the leads page, the owner field is already filled with the individual creating the lead, and it stays changeable.
- **Who:** The person creating the lead. Other lead lines in the document say any user account.
- **Conditions / exceptions:** The default remains editable.

### Customer-name search updates while typing

- **Section:** Site change, in the leads-page sentences.
- **Old behavior:** old behavior not stated for this box. The document says the list should auto-update the way the DMS and CRM pages already do.
- **New behavior:** Typing in the customer name box updates the list, similar to DMS and CRM.
- **Who:** Leads page.
- **Conditions / exceptions:** Follow the existing DMS and CRM auto-update. That existing behavior is not described beyond auto-update.

### Confirm before closing a lead

- **Section:** Fix, with a specific close-lead rule. See also the confirmation list.
- **Old behavior:** Many menus give no confirmation for unsaved data or for changes that were made. Leads surfaces in that list are Add lead + Edit, and Leads > Open.
- **New behavior:** Add lead and Edit confirm on unsaved data, like the other listed menus. When closing a lead, confirm before saving.
- **Who:** Any user account > Leads > Add lead + Edit; any user account > Leads > Open; closing a lead.
- **Conditions / exceptions:** The close rule is specifically “confirm before saving.” The “larger change” sentence belongs to Manager > Team > Dealership profile, not to leads (see the confirmation section).

### Reopen a closed lead

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** There should be a way to reopen a lead that is closed. The example is an accidental closure.
- **Who:** Not named.
- **Conditions / exceptions:** Accidental closure is the example. The document does not limit reopen to that case, and it does not say which status or label is restored.

### Block a second lead for the same customer and vehicle

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** A duplicate lead with the same customer and the same vehicle cannot be created, to avoid redundancy.
- **Who:** Not named.
- **Conditions / exceptions:** The match is the same customer and the same vehicle. Other duplicate cases are not mentioned.

### Selling the vehicle closes the related leads

- **Section:** Site change.
- **Old behavior:** old behavior not stated.
- **New behavior:** Leads are tied to vehicle sales. When a vehicle is sold to a customer, they are automatically closed, with the appropriate label applied to the customers tied to the lead.
- **Who:** Not named. The trigger is the vehicle sale.
- **Conditions / exceptions:** The label is “the appropriate label”; its name is not given. The document says the label is applied to the customers tied to the lead. It does not say what happens for a buyer entered as Other.

## Team join requests and activity

### Split join requests into current and past tables

- **Section:** Site change.
- **Old behavior:** Join requests lists every request.
- **New behavior:** Two tables. One holds current requests that need to be approved or rejected. One holds past requests that have been approved or rejected.
- **Who:** Any manager account > Team > Join requests.
- **Conditions / exceptions:** Current means still needing approval or rejection. Past means approved or rejected. Other statuses are not mentioned.

### Label the activity day pickers

- **Section:** Site change.
- **Old behavior:** The day pickers on the team activity page are unlabelled, and a user may have trouble telling what they do. The admin audit log day pickers are also unlabeled.
- **New behavior:** Change the team activity day pickers. Change the admin audit log day pickers the same way.
- **Who:** Manager account > Team > Activity; platform admin audit log.
- **Conditions / exceptions:** The label text is not specified.

### Search the activity log by the change

- **Section:** Site change. The same idea is repeated for the admin audit log.
- **Old behavior:** old behavior not stated.
- **New behavior:** Search the activity log by the change made. The example is searching “password” to find login requests made with passwords.
- **Who:** The location line after this request is any manager account > Team > Activity.
- **Conditions / exceptions:** The example is the word “password”. The document does not define the searchable text beyond “the change made.”

### Put activity search options and columns in the same order

- **Section:** Site change.
- **Old behavior:** old behavior not stated. The document asks for the same order so the page looks better, and it does not list today’s order.
- **New behavior:** Search options and columns are in the same order.
- **Who:** Any manager account > Team > Activity.
- **Conditions / exceptions:** The target order is not listed.

### Team activity user search accepts a partial name

- **Section:** Site change.
- **Section note:** Author suggestion (“I suggest”).
- **Old behavior:** Searching team activity by users does not show results on partial searches.
- **New behavior:** Those searches work with partial searches.
- **Who:** Team activity user search.
- **Conditions / exceptions:** The document states the failure for user search. It does not say every activity field fails partial match.

## Platform admin audit log

### Order, change search, partial search, and day-picker labels

- **Section:** Site change. Day-picker labeling is also stated earlier with team activity.
- **Old behavior:** The day picker boxes are unlabeled. For search-option order, change search, and partial search on this log, old behavior not stated. Partial failure is stated for team activity user search. For the admin log the document asks that partial searches return results, which implies they do not today.
- **New behavior:** Search options and columns are in the same order. Admin can search based on changes. Partial searches return results. Day pickers are labeled in line with the team activity change.
- **Who:** Platform admin > audit log.
- **Conditions / exceptions:** The target column order and the partial-search fields are not listed.

## Confirmation when data is unsaved or a change is saved

- **Section:** Fix.
- **Old behavior:** Many menus give no confirmation when there is unsaved data or when changes are made. The document says that can cause accidental changes, loss of data, and frustration.
- **New behavior:** Those menus should confirm. Manager > Team > Dealership profile is described as a larger change and requires confirmation before it is saved. Closing a lead requires confirmation before saving.
- **Who:** The written list is:
  - Platform admin > Dealerships > Edit
  - Any user account > DMS > Add vehicle + Edit
  - Any user account > CRM > Add customer + Edit
  - Any user account > Leads > Add lead + Edit
  - Manager account > Team > Dealership profile
  - Any user account > Leads > Open
  - Closing a lead
- **Conditions / exceptions:** The document points at screenshots and does not say every form in the product is included. Unlike the full-name places and the search boxes, this list has no “may be more” caveat. Dealership delete and user delete have their own “at least one extra step” rule.

## Sortable columns on existing lists

- **Section:** Client request. The client named DMS columns. The author added other screens. The author says further columns not in the list may also be made sortable.
- **Old behavior:** old behavior not stated.
- **New behavior:** The columns below are sortable.
- **Who:**

| Screen | Sortable columns |
| --- | --- |
| Any user account > DMS | Stock#, Body, Source, Condition, Cost, List Price, Date Added, Open WOS, Status |
| Any user account > Leads | All |
| Any user account > Team > Members | Role, Source, Date Added (when added) |
| Any user account > Team > Activity | When, Actor, Action, Record (type followed by number), Source IP, Location |
| Any user account > Team > Join Requests | Requested, Status, Resolved |
| Platform admin > Audit log | When, Actor, Action, Record (type followed by number), Location |
| Platform admin > Ad Rules | Enabled, Severity |
| Platform admin > Pending accounts | Registered |
| Platform admin > Members | Dealership, Role, Sign-in, Status |
| Manager account > any menu with audit | Action, Actor, When |

- **Conditions / exceptions:** Sold by, Sold to, and Date sold are new DMS columns and are not in this sortable list. Team activity includes Source IP; the platform-admin audit log list does not. Sort direction, multi-column sort, and the default sort are not stated. Extra columns beyond this list are allowed and are not named.

## Net-new requests (pointers only)

These are additions. This note does not treat them as changes to a stated current behavior.

- The client requested that home-page create account become a way for dealerships to inquire about using the service. Only a different account-creation method needs more client discussion. The interim change is removing the button, covered above.
- Optional dealership admin / owner / regional manager, with some platform-admin capabilities limited to one dealership. Discuss with the client before full implementation. The document’s privilege order, most to least, is platform admin, that dealership role, dealership manager, dealership staff, and user not logged in. **Decided 2026-11-03:** implemented as one Owner tier, giving Platform admin, Owner, Manager, Sales (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md`).
- DMS search by Stock #.
- DMS search for vehicles with open work orders.
- Leads search by vehicle name.
- Add a lead from inside the customer menu.
- Add notes about a customer in the customer menu.
- Show leads on DMS vehicle information, with a possible column for how many leads a vehicle has.
- Search for dealerships on the shop page.
- Search one dealership’s inventory for a specific vehicle on the buyer site.
