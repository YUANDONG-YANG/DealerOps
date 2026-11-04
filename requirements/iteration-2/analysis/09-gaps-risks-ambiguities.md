# Gaps, risks, and ambiguities

Review of `requirements/iteration-2/Changes Document.docx` only. This note does not add product requirements and does not propose a redesign. Each finding ends with the question the team must answer before anyone builds it.

The document has two sections:

- **Client Requests.** "The client has requested several things directly; these are urgent changes that must be completed first."
- **Site Fixes and Changes.** "These are issues that have been located with the site and things I believe should be changed, they are less urgent than the client requests but should still be implemented, especially the fixes."

About seventy figures show the current screens. They are evidence of where a problem was seen. They are not target mockups. The caption "Where columns should go" sits on the current DMS table and does not mark an insertion point. The sell-vehicle figure shows Sold date, Sold price, and an optional "Buyer (CRM customer)" control. The sales-report figure shows all-time cards plus one month row. The dashboard figure has a red arrow pointing at the Sales heading. The Team figure's own subtitle reads "New members join as staff; the platform admin appoints managers." The audit figures show a Location column; the screenshots were taken from an origin/robin build, where commit 54b6664 added the audit Location column (`audit_event.client_location`). That column is now on branch V2, so the Location sort requests describe an existing column.

**Priority**

- **High.** The team can ship the wrong behavior, or the item is too large and too undefined for a small capstone, until the question is answered.
- **Medium.** A developer can implement it only by guessing rules, copy, or edge behavior.
- **Low.** Wording, labeling, or a local edge that can wait until the high questions are closed.

## Decisions required before build

These are the high questions in one place. Detail is in the sections below.

1. Which sentences are in this delivery: every client bullet, or only the ones the client confirmed, with "for now" and "optional" items left out?
2. Is every "Change:" and "I suggest" in section 2 required, or only the items marked as fixes?
3. Who is "sold by," and what does "sold to" show when the buyer is not a CRM customer?
4. What numbers, date boundaries, and employee definition do the day/week/month/year sales views use?
5. Which employee fields may a manager change, and may a manager demote another manager? **Answered 2026-11-03:** full name and phone, for sales members only; no demotion of a manager.
6. Is the dealership admin/owner/regional-manager role out of this delivery? **Answered 2026-11-03:** no — it is in, as one dealership Owner tier (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md`).
7. Is home-page account creation hidden or replaced by a dealership inquiry? (Sample ads stay on sign-in under decision D4, which follows the client; see A-07.)
8. Which leads close when a vehicle is sold, with which label, and who may reopen them?
9. Which platform-admin powers are removed (direct bind) and which are added (edit, delete users, delete dealerships, edit pending accounts)? Who approves the first member of a new dealership? **Answered 2026-11-03:** nobody — the platform admin binds the first owner directly, and only later members come through a join request the owner approves (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §2).
10. Are cost, work-order spend, and list price on the sell dialog read-only displays of data the vehicle already has?

## 1. Ambiguous terms and statements

### A-01. High. "Who sold the vehicle" has no source

> "Sold by – this column should list who sold the vehicle"

The same section asks the sell menu to add "cost, total number spend on work orders, and list price." That list does not include a salesperson. The sell figure has no seller field.

**Question:** Is the seller the signed-in user at the moment of sale, a team member chosen in the dialog, or a name typed by hand? When is that value stored?

### A-02. High. "Sold to" and the free-text buyer are different ideas

> "Sold to – this column should list the customer who bought the vehicle"

> "the vehicle sale is required to link to a customer before it can be sold, with the option to pick “other” and manually type in a buyer."

**Question:** What does the Sold to column show for "other"? Is the typed name stored as sale text, or does it create a customer? What does the column show for a vehicle that is still in stock?

### A-03. High. Sell-menu "cost," work-order spend, and list price are unnamed fields

> "When the sell vehicle action is clicked, the client has asked that more information be presented in that menu. The client wants the following added; cost, total number spend on work orders, and list price."

The DMS table already has Cost and List price columns. "Total number spend" does not say which work orders are summed (open, done, cancelled) or whether the figure is a count or a money amount.

**Question:** Are these three values read-only displays of fields the vehicle already has, and which stored amounts do "cost" and "total number spend on work orders" use?

### A-04. High. Sales "information," periods, and "options" are undefined

> "The client would like to be able to see sales information for the current day, week, month, year and have each listed as options, the client would also like to see this in the sales section of the dashboard. The client would also like a list of all sales employees and their sales metrics."

The sales-report figure is a set of all-time totals plus a month table (sold, revenue, gross profit). The dashboard Sales section shows "Sold this month" and "Vehicles sold." The arrow only marks that section.

**Question:** Is the control one period at a time, or four sets of numbers shown together? Which of the existing figures (units, revenue, gross profit, average days to sell, in-stock) change with the period? What is a week (which weekday starts it, which timezone)? Who counts as a sales employee, which metrics are shown, and for which period?

### A-05. High. "Certain employee information" and "when the member joined"

> "The client has requested that manager accounts be allowed to promote other staff to managers, as well as being able to edit certain employee information. The client has also requested a column in the members section listing when the member joined"

The sortable-column list later says Members columns include "Date Added (when added)." The Members figure has Member, Username, Role, Source, and Actions. It has no date column.

**Question:** Which fields are editable? Is "when the member joined" the membership start, the account creation time, or the same column as "Date Added (when added)"?

**Answered 2026-11-03** for the fields: full name and phone, and no more — a manager edits them for a sales member, the owner for any member below owner (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §3 and §5a). The date question stands.

### A-06. High. One slash-combined role name

> "a dealership specific admin/owner/regional manger account that has some admin capabilities to change things with the dealership, like the platform admin account, but is exclusive to a single dealership."

**Question:** Is this one new role or three names for powers the dealership manager might receive? Which "things with the dealership" would that account change? (See C-02: the same document says not to implement this yet.)

**Answered 2026-11-03:** one new role. `admin`, `owner` and `regional manager` all mean the dealership Owner, and the things it changes are the dealership profile, join requests, manager and sales appointments, a below-owner member's full name and phone, and the dealership audit log (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §3).

### A-07. High. "Create account" becomes an inquiry, a removed button, or a sign-up page

> "the create account functionality on the home page be converted into a way for dealerships wanting to inquire and potentially use the service"

> "For now, removing the button to create account from the home page will suffice."

> "The sample ads on the home page link to the sign in page. I believe most people who are clicking on the ads are potential users and this should link to the sign-up page."

The sample-ad sentence is an author suggestion ("I believe"); the client request (CR-009) is to remove home-page account creation. Decision D4 follows the client: sample ads stay on `/login`, a recorded decision against the author suggestion.

**Question:** For this delivery, is the acceptance criterion only that the home-page create-account control is hidden? If the inquiry stays in scope, what fields does it collect, and who receives it?

### A-08. High. "They" and "the appropriate label" on sale

> "Leads should be tied to vehicle sales. When a vehicle is sold to a customer, they should be automatically closed with the appropriate label applied to the customers tied to the lead."

**Question:** What is closed: the leads, or the customer records? Which leads (only that buyer's open leads, every lead on the vehicle, leads with no vehicle)? Which existing lead outcome is "the appropriate label"? What is stored on the customer?

### A-09. High. "Directly bind" versus "send the join request"

> "The platform admin should not be able to directly bind accounts to dealerships, instead they should only be able to send the join request to the dealerships."

**Question:** Does the admin still create the account and the temporary password? Does "send the join request" create a pending request that a dealership manager must approve? What happens for a dealership that has no manager yet?

### A-10. High. "Admins" is not a single actor

The document says "manager accounts," "any user account," "any manager account," "platform admin," and "Admins" in different bullets. Delete-user, edit-account, and pending-account bullets say "Admins" without "platform." The dealership-delete bullet does say "platform admin."

**Question:** For each "Admins" bullet, is the actor only the platform admin?

### A-11. High. VIN "forced to match vehicle information"

> "VINs should be forced to match vehicle information in DMS page"

**Question:** Which fields must match a decoded VIN (year, make, model, others)? Is this check on create, on edit, and on sell? What is the result when the lookup has no record or the user disagrees with it?

### A-12. High. Carfax "exclusive" and "an actual Carfax link"

> "I suggest that the “Carfax URL” box in DMS should be exclusive and require an actual Carfax link before the information is saved."

**Question:** Exclusive among vehicles in one dealership, or globally? Is a blank value still allowed? Which hosts count as Carfax? Does a failed check block the whole vehicle save?

### A-13. High. Inventory search sentence is cut off

> "Additionally there should be a way to search a dealerships inventory for a specific vehicl"

The sentence ends mid-word. No fields are named.

**Question:** Was text lost after "vehicl"? Search by which values, on the public inventory of one dealership?

### A-14. High. "Confirmation" covers two different behaviors

> "Many menus give no confirmation when there is unsaved data or when changes are made, this can cause many issues such as, accidental changes, loss of data, frustration"

> "A larger change like this should require a confirmation before it is saved."

> "When closing a lead, confirm before saving"

The listed screens are dealership edit, vehicle add/edit, customer add/edit, lead add/edit, dealership profile, and closing a lead. The ellipsis in "frustration, … screenshots" ends the list of problems, not the list of screens; the open-ended scope comes from "Many menus" (R-06).

**Question:** For each listed screen, is the required behavior a warning when leaving with unsaved edits, a dialog before the save is committed, or a message after a successful save?

### A-15. High. Audit search example uses the word "password"

> "There should be a way to search the activity log based on the change made, such as searching the word “password” to find all login requests made with passwords"

The same idea is repeated for the platform admin audit log: "admin should also be able to search based on changes."

**Question:** Is the match on action or record labels, or on the stored text of a change? Which rows should the word "password" return? The answer needs to stay inside the existing rule that secrets are not written into the audit trail or application logs.

### A-16. Medium. Sort lists name columns and stop there

Examples:

> "Sortable Columns: All"

> "Sortable Columns: Stock#, Body, Source, Condition, Cost, List Price, Date Added, Open WOS, Status"

> "When logged in as manager account > Any menu with audit"

> "Sortable Columns: Action, Actor, When"

**Question:** For each table, what is the default sort, are empty cells first or last, and does "All" include action columns? Which screens count as "any menu with audit"? Is "Open WOS" the existing Open WOs column?

### A-17. Medium. Join-request tables

> "I feel this should be split into to tables, one for current requests that need to be approved or rejected and one for all past requests that have been approved or rejected."

The sortable columns named for this screen are "Requested, Status, Resolved."

**Question:** Which statuses are "current"? Do withdrawn or cancelled requests appear, and in which table? Does "Resolved" exist on the current table?

### A-18. Medium. Activity and audit search mechanics

> "The search options and columns should be in the same order"

> "When searching team activity by users results are not shown on partial searches"

> "Searches in admin audit log should return results when partial searches are entered."

> "The day pickers in the team activity page are unlabelled"

**Question:** Which side is reordered, the filters or the columns, and to which sequence? Partial match on which fields, with what minimum length? What label text goes on each day picker, and are the dates inclusive?

### A-19. Medium. DMS filters and the add-vehicle brand lists

> "I suggest the “Make” and “Model” boxes be removed."

> "I suggest that this box be turned into a typeable box." (Year)

> "I suggest adding a box to be able to search based on Stock #"

> "splitting the drop down into two sections, one listing major brands and one listing every brand."

> "If possible, I suggest only listing model years that the selected vehicle can be used with. If this is too hard to implement for every vehicle I suggest only implementing it for common vehicles."

> "I suggest that the VIN box should be moved to the top. I would also suggest that a box be created to search for vehicles with open work orders"

**Question:** If Make and Model are removed, is an exact make or model filter still required? What may be typed in Year? Is a separate Stock # box required if the existing search already matches stock number? Which makes are "major," and which catalog supplies "every brand" and the years for a make? What is a "common vehicle"? Is the open-work-order box a DMS list filter or part of the add-vehicle form?

### A-20. Medium. Lead and CRM form suggestions

> "making the boxes similar to that seen in the leads menu"

> "the owner field be already filled in, but changeable, to the individual creating a lead."

> "a search box be added for vehicle name"

> "when a name is typed into the “customer name” box the list should auto update, similar to the DMS and CRM pages."

> "replacing this with the leads for the customer."

> "Being able to add a lead inside of the customer menu"

> "a way to add notes about customers in the customer menu"

> "a column for the amount of leads a vehicle has"

**Question:** What interaction should Customer and Vehicle of interest copy from leads? What string is a "vehicle name"? Is the CRM replacement a count, a list, or a link, and of which leads? Does the "amount of leads" on a vehicle (and on a customer) count open leads only or all leads, and does it include leads created by buyer-site inquiries? Is a customer note a separate record from lead notes, and who may add or edit it? May a manager create a lead whose owner starts as someone else?

### A-21. Medium. Duplicate-customer warning

> "if the name, email, phone, or address are the same, I suggest that a notification pop up saying something similar to “a customer with this name/email/phone/address (based on what it is) already exists, are you sure you would like to create a new customer” before allowing creation."

> "phone numbers are exclusive for customers, I feel they shouldn’t be"

The path line under this item is "Logged in as any user account > CRM > Add customer + Edit."

**Question:** Is the match exact or partial, and is it case-sensitive? Does the warning apply on edit as well as create? After the user confirms, is the save allowed for every field, including phone?

### A-22. Medium. Duplicate leads

> "Duplicate leads, with the same customer and vehicle, should not be able to be created"

**Question:** Does this include closed leads, leads with no vehicle, and a second buyer-site inquiry for the same customer and vehicle? What does the user see when creation is refused?

### A-23. Medium. Reopen a closed lead

> "There should be a way to reopen leads that are closed, this can be useful in the case of something like an accidental closure."

**Question:** Who may reopen a lead, from which closed outcomes, and what outcome does it return to? What happens to a sale that closed that lead (A-08)?

### A-24. Medium. Delete and edit need a concrete confirm and a field list

> "this should be a more complex decision requiring at least one extra step to confirm." (dealership delete, and again for user delete)

> "admin should be able to edit some information on accounts, such as email or phone number."

> "Pending accounts should be able to be edited in some way by admin, such as email, phone, username"

**Question:** What is the extra step? Which account fields may be edited on an active user, and which on a pending account? May the username change?

### A-25. Medium. Public-page copy and shop details

> "there should be something bigger on the home page saying that that page is for dealerships and not customers."

> "The dealership shop page shouldn’t say “used” as many dealerships hold and sell new vehicles."

> "a way to search for dealerships on the dealership shop page"

> "list dealerships address and some contact information on each of the dealerships on the page"

> "There should be a back button in the dealership buyer site."

> "the character limit should be visible when it becomes closer."

**Question:** What sentence is added, and where? Is "used" removed from one heading while each vehicle still shows its condition? Search dealerships by which fields? Which address and contact values are public on the directory card? Does the back control return to the dealership list? On the inquiry message, at what remaining count does the limit appear?

### A-26. Low. Labels and error text without a target string

> "Display name should be listed as full name in Profile and when creating a staff account through the admin page"

> "typing the username with incorrect characters returns a difficult to read error."

Before the change (branch v1), `frontend/react/src/pages/ProfilePage.tsx` and the admin staff drawer in `frontend/react/src/pages/AdminPage.tsx` label the field "Display name", with the hint "Display names are unique". The label change is real work, separate from the uniqueness fix (C-06).

**Question:** What should the username error say, and should it use the character rules the account API already enforces?

### A-27. Low. Author voice is mixed with client voice

Section 2 uses "FIX," "Fix," "Change," "Changes," "I suggest," "I feel," and "If possible" for items the subtitle says should still be implemented. Section 1 includes "if you feel any other columns that I haven’t listed should be sortable feel free to add that functionality."

**Question:** Which of those phrases are acceptance criteria, and which are notes the team may ignore?

## 2. Internal contradictions

### C-01. High. Section 1 is both mandatory and deferred

> "these are urgent changes that must be completed first."

> "this is something we need to discuss further with the client. For now, removing the button to create account from the home page will suffice."

> "This functionality is optional and should likely be discussed further with the client before full implementation occurs."

> "feel free to add that functionality."

**Question:** Which client-request sentences are in the acceptance set for this delivery?

### C-02. High. The privilege ladder includes a role the text says not to build yet

The ordered list is:

> "Platform admin"

> "Dealership admin/owner/regional manager"

> "Dealership manager"

> "Dealership staff"

> "User not logged in"

The paragraph above that list says the dealership admin/owner/regional-manager account is optional and should be discussed before implementation. The Team screenshot in the same document says the platform admin appoints managers.

**Question:** Is that middle role a discussion note, with no build work in this delivery?

**Answered 2026-11-03:** it is build work. The three names are one role, the dealership Owner, and the ladder is Platform admin, Owner, Manager, Sales. The screenshot's "the platform admin appoints managers" is superseded: the platform admin binds the first owner and the owner appoints managers (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §1–§2).

### C-03. High. "Any user account" is sent to manager-only Team pages

> "When logged in as any user account > Team > Members"

> "When logged in as any user account > Team > Activity"

> "When logged in as any user account > Team > Join Requests"

Other bullets correctly say "any manager account" for join requests and activity. Staff do not have the Team page in the current product, and the document never says staff should gain it.

**Question:** Are the Team sort rules for managers only?

**Answered 2026-11-03:** Team is open to the owner and the manager; the Sales role has no Team access (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §3).

### C-04. High. Sale linking, "other," sold-to, duplicate leads, auto-close, and reopen do not fit one story

Read together, the document requires all of the following:

- Sold to is the customer who bought the vehicle (A-02).
- A sale must link to a customer, or use "other" and a typed buyer (A-02).
- A second lead for the same customer and vehicle cannot be created (A-22).
- A sale automatically closes leads and applies a label to customers on the lead (A-08).
- A closed lead can be reopened (A-23).

**Question:** For one sale, which leads change state, what Sold to displays, and what a later reopen is allowed to undo?

### C-05. High. Platform admin is both locked out of dealership access and given delete and edit

> "prevent a platform admin from being able to create an account to go and access a dealerships customer and vehicle database, something the client asked platform admins to not be able to do."

The same section then asks admins to edit pending accounts (email, phone, username), edit user email or phone, delete users, and delete dealerships.

**Question:** Which of those admin actions stay in scope, given the client's limit on platform-admin access to a dealership's customer and vehicle data?

### C-06. Medium. Full-name uniqueness and the "full name" label are separate fixes that read as one problem

> "Currently an account is unable to be created if the full name is already used."

> "Display name should be listed as full name in Profile and when creating a staff account through the admin page"

Renaming the label does not allow two people to share a name. The uniqueness bullet lists three entry points and says "there may be more." Both fixes are needed: the labels still say "Display name" (A-26).

**Question:** Is the unique full-name rule removed for every create and profile edit, with the label renamed to "Full name" on Profile and the admin staff drawer?

### C-07. Medium. Customer phone is both a hard block and a confirm-to-continue warning

The document says customer phone numbers are exclusive and "shouldn’t be," and also asks for a confirmation when the phone is the same so the user can still create the customer. Email is included in that warning. The current customer rules already allow a duplicate email with a warning and reject a duplicate phone.

**Question:** After this change, is a duplicate customer phone a warning the user can accept, and does the duplicate-email warning stay as it is?

### C-08. Medium. Home page is for dealerships, while the same document expands the public shop

> "that page is for dealerships and not customers."

Later bullets add dealership search, public address and contact details, a back control, inventory search, and a clearer inquiry character limit on the shop reached from the home page. Sample ads are treated as something "potential users" click.

**Question:** Who is the home page for, dealership staff or vehicle shoppers, and which of the shop bullets stay if the page is only for dealerships?

### C-09. Medium. Members "Date Added" is required as a sort column before it exists as a displayed column

Sort rules list "Date Added (when added)" on Team > Members. The client column request is "when the member joined." The Members figure has neither column.

**Question:** Is there one new date column, and what is its header?

### C-10. Low. Section 2 subtitle ranks fixes above changes, then writes almost every item as a change that should still ship

> "especially the fixes."

Most of the section is "Change:" or "Changes:" written as suggestions ("I suggest," "I feel").

**Question:** Does "especially the fixes" mean the suggestion items are optional?

## 3. Missing actors, preconditions, postconditions, and acceptance criteria

The document names screens ("Logged in as … > …") more often than it names outcomes. The items below have no acceptance criterion a reviewer could pass or fail without inventing one.

### M-01. High. No actor or audit outcome for automatic lead closure

A-08 does not say whether a staff member and a manager both trigger the close, whether the signed-in user is the audit actor, or what is written when the matching lead is already closed.

**Question:** Who performs the close, what audit row is written, and what is the lead's state after a successful sale?

### M-02. High. No precondition for promoting staff

The document does not say that the target must be staff at the same dealership, that the actor must be a manager of that dealership, or what happens if the target is already a manager or is the actor.

**Question:** Who may promote whom, and what does the member row show after promotion?

**Answered 2026-11-03:** a manager may promote a sales member of the same dealership to manager and nothing else; the owner appoints managers and sales and may demote a manager to sales; nobody changes their own role and nobody inside the dealership sets `OWNER` (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §2).

### M-03. High. No postcondition for removing the create-account control

A-07 does not say whether the register route, the admin "create staff" flow, and Google or other sign-up paths remain. The uniqueness fix lists "On home page, clicking any of the create account options" as a place the bug occurs. Hiding the button and fixing creation are both in the document.

**Question:** Which account-creation paths remain available after the home-page button is removed, and which of those paths must allow a duplicate full name?

### M-04. High. Destructive deletes have no resulting state

Dealership delete and user delete require "at least one extra step" and say nothing about vehicles, customers, leads, memberships, pending join requests, or audit rows afterward.

**Question:** After a confirmed delete, what can each actor still open, and which history rows remain?

### M-05. Medium. DMS sold columns have no empty-state or placement rule

"Where columns should go" is a caption on the current table. There is no rule for in-stock rows, for a sale with no linked customer, or for how Date sold is formatted relative to the existing sold-date field.

**Question:** Where do the three columns sit, and what does each cell contain for an in-stock vehicle?

### M-06. Medium. Employee sales list has no columns and no empty state

A-04 asks for "a list of all sales employees and their sales metrics" with no columns, no sort, and no rule for a dealership with sales and no assigned seller (A-01).

**Question:** What are the columns, and what is shown when nobody is recorded as the seller?

### M-07. Medium. Unsaved-data list has no per-screen outcome

A-14 names screens and not the trigger (navigate away, close the dialog, switch tabs, sign out).

**Question:** What user action opens the confirmation, and what happens on confirm versus cancel?

### M-08. Medium. Customer notes and in-customer lead create have no fields

A-20 names the capability and not the fields, the length limit, or whether the new lead uses the existing lead form with the customer fixed.

**Question:** What can be entered, and what record exists afterward?

### M-09. Medium. Public shop additions have no acceptance examples

A-13 and A-25 name a back control, a search, and "some contact information" without a single example of a successful search or a card's contents.

**Question:** What does a shopper see and do on the directory and on one dealership's inventory after the change?

### M-10. Low. Sortable-column bullets have no failed-sort case

A-16 does not say what a keyboard or pointer user does, or how a date, money, or status column orders.

**Question:** What is the first click and the second click expected to do on one named column in each table?

## 4. Missing error and edge cases

### E-01. High. Sale when leads and work orders disagree

The document never says what the sell dialog does when the vehicle has open work orders, when several leads point at it, when the chosen customer has a closed lead, or when "other" is chosen and the name is blank.

**Question:** Which of those cases block the sale, and what message is shown?

### E-02. High. First manager cannot be created if admin bind is removed

If the platform admin can only send a join request, a new dealership with zero managers has nobody to approve it. The document does not describe that case. See A-09 and C-05.

**Question:** How does the first manager of a new dealership get access?

### E-03. High. Duplicate full names in lists that show only the name

If full-name uniqueness is removed (C-06), Members, audit Actor, and Sold by can show two identical names. The document does not say how those rows stay distinguishable.

**Question:** Which extra identifier is shown wherever the full name is the human label?

### E-04. High. Shared customer phone and buyer inquiries

The document allows a shared customer phone after confirmation (A-21). It does not mention the public inquiry path, which today attaches an inquiry to the customer with that phone.

**Question:** If two customers share a phone, which customer does a buyer-site inquiry use?

### E-05. Medium. Period boundaries

A-04 does not say what "current day" means near midnight, whether the dealership has a timezone, how a sale dated today and a sale dated in a future-invalid or past month are counted, or whether in-stock inventory stays on screen when a short period has zero sales.

**Question:** What are the inclusive start and end instants for day, week, month, and year, and what is displayed when the period has no sales?

### E-06. Medium. Promotion, edit, and remove collisions

No rule is given for promoting the last staff member, editing a user who is mid-session, demotion, a manager editing their own role, or removing a member who is the owner of open leads.

**Question:** Which of those actions are allowed, and what happens to open leads owned by a removed or edited member?

### E-07. Medium. Pending-account edit and remove

No rule is given for editing a pending account that already has a join request, for changing the username to one that exists, for clearing the only email or phone, or for removing an account that is already a member.

**Question:** What errors are returned in those cases, and does the person who owns the account get any notice?

### E-08. Medium. Lead duplicate and reopen races

No rule is given for two staff creating the same customer-vehicle lead at once, for reopening a lead when a duplicate open lead now exists, or for a sale that closes a lead while another user is editing it.

**Question:** What does each user see, and which save wins?

### E-09. Medium. VIN and Carfax failures

A-11 and A-12 do not say what happens when the VIN service is unavailable, the VIN is valid but unknown, the Carfax value is not a URL, or an existing saved vehicle fails the new rule on edit.

**Question:** Which of those cases block save, and is an existing vehicle left unchanged until someone edits it?

### E-10. Medium. Delete of a dealership or user that still has business data

No rule is given for a dealership with in-stock vehicles, open leads, or unsettled work orders, for deleting the platform admin, or for deleting the last manager.

**Question:** Which of those deletes are refused, and with what message?

### E-11. Low. Filter and sort edges

No rule is given for a non-numeric Year, a Stock # search with surrounding spaces, partial user search that matches several people, or sorting Open WOs when the value is zero or blank.

**Question:** What does each of those inputs return?

### E-12. Low. Inquiry length display

A-25 does not say whether the limit is the existing inquiry message limit, or what happens when the shopper pastes a message that is already over the limit.

**Question:** What is the limit, and what is shown when the text is already too long?

### E-13. Medium. Duplicate-lead block versus a buyer-site inquiry

A buyer-site inquiry finds the customer and creates a lead. If duplicate customer-vehicle leads are refused (A-22), a second inquiry from the same shopper about the same vehicle would either fail on the public page or be dropped.

**Question:** Does a repeat inquiry attach to the existing open lead (for example as a note), or is it refused, and what does the shopper see?

## 5. Scope holes and unstated dependencies

### S-01. High. Section 2 is an open list

> "I have found three places where this occurs but there may be more."

> "This may not be all the boxes needing changes."

> "if you feel any other columns that I haven’t listed should be sortable feel free to add that functionality."

**Question:** Is the work limited to the screens and columns written in the document?

### S-02. High. Several "new" behaviors depend on rules the document never cites

The team already has behavior for these areas. The change request does not say whether that behavior stays.

| Change-request item | Existing behavior the item depends on | Question |
| --- | --- | --- |
| Sold date, sold price, optional CRM buyer | Sell dialog already collects those | Is the work new columns and read-only context, or a new sale record? |
| Day/week/month/year sales | Sales report and dashboard already show units, revenue, gross profit, and a month breakdown | Do the new periods reuse those measures? |
| Promote staff | Only the platform admin changes a membership role; managers cannot remove a manager | Does manager promotion replace that rule? Answered 2026-11-03: partly — a manager may promote and remove sales members, the owner acts on managers, and the platform admin keeps the `OWNER` change. |
| Full-name uniqueness | Display name is unique; the listed screens are entry points to one rule | Is the rule removed once, for every entry point? |
| Customer phone | Duplicate phone is rejected; duplicate email warns and saves | See C-07 |
| Buyer inquiry | Inquiry finds or creates the customer by phone, then creates a lead | See E-04 |
| Lead outcomes | Leads already have stages, including won and lost, and a closed lead has limits | Which existing stage is the sale label? |
| Work-order money | Open work orders block a sale; done work has a cost | See A-03 |
| Join requests | Managers approve or reject; new members join as staff | See A-09 and E-02 |
| Audit | Sign-in and data changes are recorded; password values are not stored; managers and the platform admin read different logs | See A-15 |
| VIN | A public decode already fills vehicle fields | See A-11 |
| Shop | A public dealership directory and inventory already exist; the detail page already has contact details | Which shop bullets are new fields on the card, and which already exist on the detail page? |
| Username error | Username rules and field errors already exist | See A-26 |

### S-03. High. Brand and model-year lists need a catalog the document does not name

A-19 points at Autotrader screenshots as a visual idea. It does not name a data source. A full make/year catalog is an external dependency. "If this is too hard" and "common vehicles" leave the fallback unnamed.

**Question:** Is a two-list brand picker in this delivery? If it is, which source is used, and what is shown when that source has no years for the make?

### S-04. High. Dealership delete and user delete are data-retention decisions

The project baseline keeps audit history for business changes, and `design/15-Data-Auth-and-Gateway.md` §8.6 (NFR-07) says nothing is deleted. The document asks for delete with one extra confirm and does not say whether rows are hidden or removed.

**Question:** Is delete in this delivery? If it is, is it a hide that keeps audit history?

### S-05. Medium. Sorting is specified for many tables the client did not ask about

The client sentence is about DMS columns. The author then lists Leads, Team Members, Team Activity, Join Requests, the platform audit log, Ad Rules, Pending accounts, platform Members, and "any menu with audit."

**Question:** Are the non-DMS sort lists in this delivery?

### S-06. Medium. Lead and DMS unification is a cross-module change

Adding leads onto the vehicle, a lead-count column, duplicate-lead blocking, sale-driven lead closure, reopen, and an in-customer "add lead" action all change the lead and the sale together. None of them states an order of operations.

**Question:** Which of those six, if any, are in this delivery?

### S-07. Medium. Screenshot captions are not transcribable requirements

Column placement, the sell menu, search-control order, the leads-style customer picker, and the Autotrader comparison exist as figures. A later edit to the image would change the requirement with no sentence to review.

**Question:** Will the team write one or two sentences for each accepted figure before build, so acceptance does not depend on reading the image?

### S-08. Low. Copy and accessibility items are real and local

Unlabelled day pickers, the display-name label, the username error text, the shop word "used," the home-page audience sentence, and the inquiry character counter are small once A-25 and A-26 are answered. They do not depend on a new role or a new sale model.

**Question:** Are these accepted as a short copy-and-label pass after the high questions are closed?

## 6. Delivery risks for a small student capstone

The active work is a student capstone and should stay small. The risks below are about volume and unresolved meaning, not about a replacement architecture.

### R-01. High. Treating the whole document as one must-ship backlog

Section 1 says the client items are urgent and must be first. Section 2 says the rest should still be implemented. Counted as written, the document includes new DMS columns, a changed sell dialog, period sales, per-employee metrics, manager promotion and member editing, account-creation changes, an optional new role, sort behavior on roughly ten tables, unsaved-change confirms across "many menus," join-request history, audit search, a DMS search redesign, a brand and model-year catalog, lead reopen, CRM column and notes changes, customer duplicate policy, VIN enforcement, Carfax validation, sale-to-lead automation, admin bind replaced by join requests, pending-account edit and remove, dealership delete, user delete, and a public shop pass.

**Question:** Will the team accept a written cut line (C-01, C-10, S-01) before implementation starts?

### R-02. High. The optional role overlaps powers this document already gives managers

A dealership admin/owner/regional-manager role "like the platform admin" plus manager promotion, member edit, and the existing dealership profile is three ways to express "someone at the dealership can administer it." Building the role after also building manager promotion will duplicate the same decisions (A-05, A-06, C-02).

**Question:** Is that role deferred, with manager promotion specified on its own?

**Answered 2026-11-03:** the two were specified together, which removes the overlap. The owner holds the dealership profile, join-request approval and action on managers; the manager acts on sales members only (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §3).

### R-03. High. Period reporting and per-employee metrics are a new reporting model

The current sales view is a snapshot plus recent months. Day, week, month, year, and a per-employee breakdown need a seller on each sale (A-01) and agreed boundaries (A-04, E-05). That is larger than adding a control to the existing cards.

**Question:** Is this delivery limited to choosing among the measures the sales page and dashboard already show, until seller and period rules exist?

### R-04. High. Replacing admin bind touches tenancy

Direct bind is how a dealership gets its first staff and its first manager. Changing it to a join request (A-09, E-02) without a first-manager rule leaves new dealerships with no one who can approve access. That is a tenancy change, not a button change.

**Question:** Is the bind change deferred until the first-manager case is decided with the client?

### R-05. High. Delete dealership and delete user are high-impact and unspecified

R-04 and S-04 apply. A hard delete conflicts with `design/15-Data-Auth-and-Gateway.md` §8.6 (NFR-07, "nothing is deleted"). A confirm step does not define the data left behind. This is a poor fit for a short capstone unless the team reduces it to a single, reversible action with an explicit refuse list (E-10).

**Question:** Are dealership delete and user delete out of this delivery?

### R-06. Medium. "Many menus" and "there may be more" will expand during build

Unsaved-change handling (A-14) and the search-box sweep (A-19, S-01) are written so that finding another screen adds scope. A capstone can finish a named list. It cannot finish an open one.

**Question:** Is the confirm work limited to the screens named in the document, and the search work limited to the boxes named in the document?

### R-07. Medium. VIN-to-catalog enforcement and the brand picker depend on outside data

S-03 and E-09. A partial catalog "for common vehicles" will be wrong for the rest of inventory and has no listed set of common vehicles.

**Question:** Is the VIN work limited to a clear save error when decode and the entered year/make/model disagree, with the brand-list split deferred?

### R-08. Medium. Audit free-text search is easy to over-build and easy to get wrong

A-15. Partial search over audit text is a performance and privacy problem if it scans stored contact values. The password example must not turn into stored passwords.

**Question:** Is audit search limited to the filters the screens already have, plus a match on action and record type, until the team names the searchable fields?

### R-09. Medium. Sale-to-lead automation crosses two modules and the public inquiry path

S-06, C-04, E-01, E-04, E-08, and E-13. Shipping auto-close, duplicate blocking, and reopen in one pass will need answers the document does not contain. Each can be deferred independently.

**Question:** Which single lead rule, if any, is worth doing in this delivery?

### R-10. Low. The urgent client column and label items are the small core

Once A-01 through A-05 and A-07 are answered, the small set is: three DMS columns, read-only context on the existing sell dialog, a period control whose measures are the ones already on the sales page, a members date column, a manager promotion rule with a named field list, and hiding the home-page create-account control. The rest of the document can wait for a client decision (A-27).

**Question:** Does the team adopt that small set as the urgent delivery, and park every unanswered "I suggest" item?

## What this review does not decide

This file does not choose the cut line, rewrite the privilege model, or specify replacement screens. The next step is for the team to answer the high questions, in writing, and to mark every other bullet as in or out of this delivery.
