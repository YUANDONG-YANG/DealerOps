# Change inventory

Source: `requirements/update-cr/Changes Document.docx`

This file inventories that document only. It does not compare the document to the product, the design docs, or the code. Nothing below is added from outside the document. Wording that is awkward or incomplete is quoted as printed.

The document does not classify items as new, modified, removed, or clarified. Where the author uses a marker, it is recorded as **Author marker**. **Change type** is filled only when the sentence itself says the behavior is removed, optional, a replacement, or an interim removal. Otherwise the change type is not stated.

Embedded screenshots illustrate the current screens. They are not separate requirements. A screenshot is described only where the document uses it to state placement or a comparison that the sentence does not spell out. The file contains 70 pictures. It contains no tables, no headers, no footers, and no comments.

## Document identity

| Field | What the document states |
| --- | --- |
| File name | Changes Document.docx |
| Title | Empty. Core properties `dc:title` is blank, and the body has no title paragraph. The first heading is "Client Requests". |
| Date | Not stated in the body. Core properties: created 2026-11-03T10:54:00Z, modified 2026-11-03T14:34:00Z. |
| Version | Not stated in the body. Core property `revision` is 1. That is the file-revision count, not a document version. |
| Author | Jackson Warga, recorded as both creator and last modifier. The body does not name an author. The body uses first person ("I"). |
| Subject, description, keywords, company | All empty in the document properties. |
| Size recorded by Word | 27 pages, 1,926 words, 10,983 characters. Application: Microsoft Office Word. Template: Normal.dotm. |
| Purpose | Stated in the two section subtitles, quoted under the outline below. Client requests are urgent and must be done first. Site fixes and changes are less urgent and should still be implemented, especially the fixes. |

## Heading outline

The body has two Heading 1 headings and no Heading 2 or lower headings. Each heading is followed by a Subtitle-style paragraph. Those subtitles are not headings.

1. **Client Requests** (Heading 1)
   - Subtitle: "The client has requested several things directly; these are urgent changes that must be completed first."
   - Body, in order: DMS sold columns; sell-vehicle menu; sales report and dashboard; manager staff actions and a members column; home-page account creation; an optional dealership admin role and a privilege order; sortable columns by screen.
2. **Site Fixes and Changes** (Heading 1)
   - Subtitle: "These are issues that have been located with the site and things I believe should be changed, they are less urgent than the client requests but should still be implemented, especially the fixes."
   - Body, in order: full-name uniqueness; missing confirmations; join-request tables; activity-log labels, search, and column order; search-box adjustments; leads, CRM, and DMS behavior; profile and staff-account labels and errors; platform-admin account, audit, dealership, and user actions; home page, shop, and buyer-site changes.

Neither headed section is empty. Blank paragraphs in the body are spacing only.

## Tables

The document contains no tables. There is nothing to transcribe.

## Numbered changes

Items follow document order. Identifiers CR-001 through CR-068 are assigned here; the document does not number them.

### Client Requests

#### CR-001

- **Section:** Client Requests
- **Statement:** The DMS page must gain Sold by, Sold to, and Date sold columns.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "The client has requested that the DMS page contain more columns." The columns are a numbered list: "Sold by – this column should list who sold the vehicle"; "Sold to – this column should list the customer who bought the vehicle"; "Date sold – this column should list the day the vehicle was sold."
- **Placement:** The following screenshot is captioned "Where columns should go." It shows the DMS vehicle-inventory table with a red arrow marking the gap between the Stock # and Body columns.

#### CR-002

- **Section:** Client Requests
- **Statement:** The sell-vehicle menu must also show cost, the total spent on work orders, and list price.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When the sell vehicle action is clicked, the client has asked that more information be presented in that menu. The client wants the following added; cost, total number spend on work orders, and list price."
- **Illustration:** The following screenshot is captioned "Menu in reference." It shows the current sell dialog (sold date, sold price, and buyer). The new fields are named only in the sentence above.

#### CR-003

- **Section:** Client Requests
- **Statement:** The sales report must offer current day, week, month, and year as separate options.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "The client has requested that the sales report page contain more information." Then: "The client would like to be able to see sales information for the current day, week, month, year and have each listed as options."

#### CR-004

- **Section:** Client Requests
- **Statement:** The sales section of the dashboard must show the same day, week, month, and year sales information.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "the client would also like to see this in the sales section of the dashboard."
- **Illustration:** A dashboard screenshot has a red arrow pointing at the Sales section.

#### CR-005

- **Section:** Client Requests
- **Statement:** The client wants a list of all sales employees and their sales metrics.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "The client would also like a list of all sales employees and their sales metrics." The document does not name which metrics.

#### CR-006

- **Section:** Client Requests
- **Statement:** Manager accounts must be able to promote other staff to managers.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "The client has requested that manager accounts be allowed to promote other staff to managers."

#### CR-007

- **Section:** Client Requests
- **Statement:** Manager accounts must be able to edit certain employee information.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** The same sentence continues: "as well as being able to edit certain employee information." The document does not list which fields.

#### CR-008

- **Section:** Client Requests
- **Statement:** The members section must include a column for when the member joined.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "The client has also requested a column in the members section listing when the member joined."
- **Related wording later in the same section:** The Team > Members sortable list names "Date Added (when added)." The document does not explicitly say that this is the same column.

#### CR-009

- **Section:** Client Requests
- **Statement:** Home-page account creation should become a way for dealerships to inquire about using the service, and for now the create-account button should be removed.
- **Author marker:** Client request
- **Change type:** The interim action is removal. The sentence says "removing the button to create account from the home page will suffice." The longer-term conversion is not given a change type.
- **Source:** "The client has requested that the create account functionality on the home page be converted into a way for dealerships wanting to inquire and potentially use the service." Then: "The client talked about account creation being done a different way; however, this is something we need to discuss further with the client. For now, removing the button to create account from the home page will suffice."

#### CR-010

- **Section:** Client Requests
- **Statement:** A dealership-specific admin, owner, or regional-manager account, with some admin capabilities limited to one dealership, is optional and should be discussed before it is fully implemented.
- **Author marker:** Client request
- **Change type:** Optional. The document says "This functionality is optional."
- **Source:** "What was also discussed with the client was the potentiality of a dealership specific admin/owner/regional manger account that has some admin capabilities to change things with the dealership, like the platform admin account, but is exclusive to a single dealership. This functionality is optional and should likely be discussed further with the client before full implementation occurs."
- **Privilege order stated immediately after, "From most to least privilege":**
  1. Platform admin
  2. Dealership admin/owner/regional manager
  3. Dealership manager
  4. Dealership staff
  5. User not logged in

  The privilege list is not given its own change marker.

#### CR-011

- **Section:** Client Requests
- **Statement:** On DMS, for any logged-in user, the listed columns must be sortable.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When logged in as any user account > DMS." "Sortable Columns: Stock#, Body, Source, Condition, Cost, List Price, Date Added, Open WOS, Status."
- **Scope note in the same passage:** "The client mentioned specific columns being sortable on the DMS page, on top of those ones I have highlighted several other places where columns should be sortable in the screenshots below, if you feel any other columns that I haven’t listed should be sortable feel free to add that functionality." The document does not say which of the listed DMS columns came from the client and which the author added.

#### CR-012

- **Section:** Client Requests
- **Statement:** On Leads, for any logged-in user, every column must be sortable.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When logged in as any user account > Leads." "Sortable Columns: All."

#### CR-013

- **Section:** Client Requests
- **Statement:** On Team > Members, for any logged-in user, Role, Source, and Date Added must be sortable.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When logged in as any user account > Team > Members." "Sortable Columns: Role, Source, Date Added (when added)."

#### CR-014

- **Section:** Client Requests
- **Statement:** On Team > Activity, for any logged-in user, the listed columns must be sortable.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When logged in as any user account > Team > Activity." "Sortable Columns: When, Actor, Action, Record (type followed by number), Source IP, Location."

#### CR-015

- **Section:** Client Requests
- **Statement:** On Team > Join Requests, for any logged-in user, Requested, Status, and Resolved must be sortable.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When logged in as any user account > Team > Join Requests." "Sortable Columns: Requested, Status, Resolved."

#### CR-016

- **Section:** Client Requests
- **Statement:** On the platform-admin audit log, the listed columns must be sortable.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When logged in as platform admin > Audit log." "Sortable Columns: When, Actor, Action, Record (type followed by number), Location."

#### CR-017

- **Section:** Client Requests
- **Statement:** On platform-admin Ad Rules, Enabled and Severity must be sortable.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When logged in as platform admin > Ad Rules." "Sortable Columns: Enabled, Severity."

#### CR-018

- **Section:** Client Requests
- **Statement:** On platform-admin Pending accounts, Registered must be sortable.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When logged in as platform admin > Pending accounts." "Sortable Columns: Registered."

#### CR-019

- **Section:** Client Requests
- **Statement:** On platform-admin Members, Dealership, Role, Sign-in, and Status must be sortable.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When logged in as platform admin > Members." "Sortable Columns: Dealership, Role, Sign-in, Status."

#### CR-020

- **Section:** Client Requests
- **Statement:** In any manager audit menu, Action, Actor, and When must be sortable.
- **Author marker:** Client request
- **Change type:** Not stated
- **Source:** "When logged in as manager account > Any menu with audit." "Sortable Columns: Action, Actor, When."

### Site Fixes and Changes

#### CR-021

- **Section:** Site Fixes and Changes
- **Statement:** An account must still be creatable when the full name is already used.
- **Author marker:** FIX
- **Change type:** Not stated
- **Source:** "FIX: Currently an account is unable to be created if the full name is already used. Many people have the same name and would be unable to have an account with the current system. I have found three places where this occurs but there may be more."
- **Places named:**
  - "On home page, clicking any of the create account options"
  - "Logged in as platform admin > Dealerships > Staff > Create new staff account"
  - "Logged in as any account > Profile"

#### CR-022

- **Section:** Site Fixes and Changes
- **Statement:** Menus that hold unsaved data or accept changes must confirm before those changes are lost or saved.
- **Author marker:** Fix
- **Change type:** Not stated
- **Source:** "Fix: Many menus give no confirmation when there is unsaved data or when changes are made, this can cause many issues such as, accidental changes, loss of data, frustration, … screenshots."
- **Places named under this fix, before the two more specific sentences in CR-023 and CR-024:**
  - "Logged in as platform admin > Dealerships > Edit"
  - "Logged in as any user account > DMS > Add vehicle + Edit"
  - "Logged in as any user account > CRM > Add customer + Edit"
  - "Logged in as any user account > Leads > Add lead + Edit"

#### CR-023

- **Section:** Site Fixes and Changes
- **Statement:** Saving the dealership profile must require confirmation because it is a larger change.
- **Author marker:** Fix (continuation of the confirmation fix)
- **Change type:** Not stated
- **Source:** "Logged in as manager account > Team > Dealership profile." "A larger change like this should require a confirmation before it is saved."

#### CR-024

- **Section:** Site Fixes and Changes
- **Statement:** Closing a lead must be confirmed before it is saved.
- **Author marker:** Fix (continuation of the confirmation fix)
- **Change type:** Not stated
- **Source:** "Logged in as any user account > Leads > Open." "When closing a lead, confirm before saving."

#### CR-025

- **Section:** Site Fixes and Changes
- **Statement:** Join requests should be split into a table of requests awaiting approval or rejection and a table of past approved or rejected requests.
- **Author marker:** Change
- **Change type:** Not stated
- **Source:** "Change: Currently join requests lists every single request, I feel this should be split into to tables, one for current requests that need to be approved or rejected and one for all past requests that have been approved or rejected."
- **Place named after the screenshot:** "Logged in as any manager account > Team > Join requests."

#### CR-026

- **Section:** Site Fixes and Changes
- **Statement:** The unlabeled day pickers on the team activity page, and the day pickers on the admin audit log, should be labeled.
- **Author marker:** Change
- **Change type:** Not stated
- **Source:** "Change: The day pickers in the team activity page are unlabelled, and it may be difficult for a user to figure out their functionality. Additionally there are day pickers in the admin audit log that should also be changed accordingly."

#### CR-027

- **Section:** Site Fixes and Changes
- **Statement:** The activity log should be searchable by the change that was made.
- **Author marker:** Change
- **Change type:** Not stated
- **Source:** "Change: There should be a way to search the activity log based on the change made, such as searching the word “password” to find all login requests made with passwords."

#### CR-028

- **Section:** Site Fixes and Changes
- **Statement:** On Team > Activity, the search options and the columns should appear in the same order.
- **Author marker:** Change
- **Change type:** Not stated
- **Source:** "Change: The search options and columns should be in the same order to improve the look of the page." The next location line is "Logged in as any manager account > Team > Activity."

#### CR-029

- **Section:** Site Fixes and Changes
- **Statement:** The DMS Make and Model boxes should be removed because search by VIN, make, or model already covers them.
- **Author marker:** Change. Introduced by "Change: Many search options are redundant, lack certain functionality, are confusing or should be changed in a different way."
- **Change type:** Removal. The sentence says the boxes "be removed."
- **Source:** "The “Make” and “Model” Boxes in DMS are redundant as the “Search VIN, make, or model” provides the same functionality in a better format. I suggest the “Make” and “Model” boxes be removed."
- **Author caveat for CR-029 through CR-040:** "Below I have listed all boxes I’ve found that need adjustment and the suggested change. This may not be all the boxes needing changes."

#### CR-030

- **Section:** Site Fixes and Changes
- **Statement:** The DMS Year box should become a box the user can type in.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "The “Year” box in DMS is difficult to use as there are many years listed. I suggest that this box be turned into a typeable box."

#### CR-031

- **Section:** Site Fixes and Changes
- **Statement:** DMS should gain a search by stock number.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "Additionally, I suggest adding a box to be able to search based on Stock #."

#### CR-032

- **Section:** Site Fixes and Changes
- **Statement:** The Add Vehicle make dropdown should be split into major brands and every brand, in the manner of Autotrader.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "The “Add Vehicle” drop down menu is difficult to use because of its size, I suggest splitting the drop down into two sections, one listing major brands and one listing every brand. Similar to that seen on Autotrader (see screenshots)."
- **Illustration:** The comparison pictures are labeled "Dealer-ops", "Autotrader", and "Autotrader".

#### CR-033

- **Section:** Site Fixes and Changes
- **Statement:** The model-year dropdown should list only years that fit the selected vehicle, or only common vehicles if doing this for every vehicle is too hard.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "The “model Year” drop down menu is difficult to use because of its size. If possible, I suggest only listing model years that the selected vehicle can be used with. If this is too hard to implement for every vehicle I suggest only implementing it for common vehicles."
- **Illustration:** The screenshot is the Add Vehicle form, with the Model year field marked.

#### CR-034

- **Section:** Site Fixes and Changes
- **Statement:** The VIN box should be moved to the top.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "Additionally, I suggest that the VIN box should be moved to the top." This sentence follows the Add Vehicle model-year note. The document does not repeat a page path in the sentence.

#### CR-035

- **Section:** Site Fixes and Changes
- **Statement:** There should be a box to search for vehicles that have open work orders.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "I would also suggest that a box be created to search for vehicles with open work orders." This is the second half of the same sentence as CR-034. The document does not name a separate page.

#### CR-036

- **Section:** Site Fixes and Changes
- **Statement:** The Customer and Vehicle of interest boxes should work more like the boxes in the leads menu.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "The “Customer” and “Vehicle of interest” boxes are confusing and difficult to use, I suggest making the boxes similar to that seen in the leads menu (see screenshot)."
- **Illustration:** The attached screenshots show the Add Lead form (Customer, and Vehicle of interest) and the Leads page search. The document does not describe the target interaction beyond that comparison.

#### CR-037

- **Section:** Site Fixes and Changes
- **Statement:** Searching team activity by user should return results for a partial name.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "When searching team activity by users results are not shown on partial searches, I suggest searches being able to work with partial searches."

#### CR-038

- **Section:** Site Fixes and Changes
- **Statement:** On the leads page, the owner field should start as the person creating the lead and remain changeable.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "In the leads page, I suggest that the owner field be already filled in, but changeable, to the individual creating a lead."

#### CR-039

- **Section:** Site Fixes and Changes
- **Statement:** Leads should have a search box for vehicle name.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "Additionally, I suggest that a search box be added for vehicle name."

#### CR-040

- **Section:** Site Fixes and Changes
- **Statement:** Typing in the leads customer-name box should update the list as the user types, as on the DMS and CRM pages.
- **Author marker:** Change (same search-box passage)
- **Change type:** Not stated
- **Source:** "I also suggest that when a name is typed into the “customer name” box the list should auto update, similar to the DMS and CRM pages."

#### CR-041

- **Section:** Site Fixes and Changes
- **Statement:** A closed lead must be reopenable, including after an accidental closure.
- **Author marker:** Change
- **Change type:** Not stated
- **Source:** "Change: There should be a way to reopen leads that are closed, this can be useful in the case of something like an accidental closure."

#### CR-042

- **Section:** Site Fixes and Changes
- **Statement:** The CRM vehicles-purchased column should be replaced by the customer's leads.
- **Author marker:** Changes
- **Change type:** Replacement. The sentence says "replacing this with the leads for the customer."
- **Source:** "Changes: The vehicles purchased column in CRM feels unnecessary as many people will only purchase a handful of vehicles in their life, so being able to see how many they have bought is not as useful information. I would suggest replacing this with the leads for the customer."
- **Place named:** "Logged in as any user account > CRM."

#### CR-043

- **Section:** Site Fixes and Changes
- **Statement:** A lead should be addable from inside the customer menu.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: Being able to add a lead inside of the customer menu would provide extra functionality and usefulness."

#### CR-044

- **Section:** Site Fixes and Changes
- **Statement:** The customer menu should allow notes about customers.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: There should be a way to add notes about customers in the customer menu." The document does not attach a separate screenshot or a field list to this sentence.

#### CR-045

- **Section:** Site Fixes and Changes
- **Statement:** Creating a customer whose name, email, phone, or address matches an existing customer should ask for confirmation first.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: When creating a new customer if the name, email, phone, or address are the same, I suggest that a notification pop up saying something similar to “a customer with this name/email/phone/address (based on what it is) already exists, are you sure you would like to create a new customer” before allowing creation."
- **Scope in the same paragraph:** "This both in the regular customer creation and customer creation through the leads page."
- **Place named:** "Logged in as any user account > CRM > Add customer + Edit."

#### CR-046

- **Section:** Site Fixes and Changes
- **Statement:** Customer phone numbers should not be unique, because people may share a phone and still need separate customer profiles.
- **Author marker:** Changes (same paragraph as CR-045)
- **Change type:** Not stated
- **Source:** "Additionally, phone numbers are exclusive for customers, I feel they shouldn’t be as some people share a phone number and may want separate customer profile." The same paragraph applies this to regular customer creation and to customer creation through the leads page.

#### CR-047

- **Section:** Site Fixes and Changes
- **Statement:** A VIN on the DMS page must be forced to match the vehicle information.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: VINs should be forced to match vehicle information in DMS page." The document does not say which fields must match.

#### CR-048

- **Section:** Site Fixes and Changes
- **Statement:** The DMS Carfax URL must be exclusive and must be a real Carfax link before the record can be saved.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: I suggest that the “Carfax URL” box in DMS should be exclusive and require an actual Carfax link before the information is saved."

#### CR-049

- **Section:** Site Fixes and Changes
- **Statement:** A vehicle sale must be linked to a customer, with an Other choice that lets the seller type a buyer.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: When selling a vehicle, I suggest that the vehicle sale is required to link to a customer before it can be sold, with the option to pick “other” and manually type in a buyer."

#### CR-050

- **Section:** Site Fixes and Changes
- **Statement:** Vehicle information in DMS should include the vehicle's leads, and might include a column for how many leads the vehicle has.
- **Author marker:** Changes
- **Change type:** The lead-count column is described as possible, not required. The sentence says "with the possible addition of a column."
- **Source:** "Changes: I suggest that leads be added to vehicle information in DMS, with the possible addition of a column for the amount of leads a vehicle has this would help unify the systems available for the site."

#### CR-051

- **Section:** Site Fixes and Changes
- **Statement:** A lead for the same customer and the same vehicle must not be creatable twice.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: Duplicate leads, with the same customer and vehicle, should not be able to be created, in order to avoid redundancy."

#### CR-052

- **Section:** Site Fixes and Changes
- **Statement:** When a vehicle is sold to a customer, leads tied to that sale should close automatically and receive the appropriate label.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: Leads should be tied to vehicle sales. When a vehicle is sold to a customer, they should be automatically closed with the appropriate label applied to the customers tied to the lead. This will increase integration between the systems of the site." The document does not name the label.

#### CR-053

- **Section:** Site Fixes and Changes
- **Statement:** The display-name field should be labeled as full name on Profile and on the admin staff-account form.
- **Author marker:** Fix
- **Change type:** Not stated
- **Source:** "Fix: Display name should be listed as full name in Profile and when creating a staff account through the admin page."

#### CR-054

- **Section:** Site Fixes and Changes
- **Statement:** Creating a dealership staff account with invalid username characters must return an error that is easy to read.
- **Author marker:** Fix
- **Change type:** Not stated
- **Source:** "Fix: When creating a staff account for a dealership, typing the username with incorrect characters returns a difficult to read error."
- **Place named:** "Logged in as platform admin > Dealerships > Staff."

#### CR-055

- **Section:** Site Fixes and Changes
- **Statement:** A platform admin must not bind an account directly to a dealership, and may only send that dealership a join request.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: The platform admin should not be able to directly bind accounts to dealerships, instead they should only be able to send the join request to the dealerships. This will improve security and prevent a platform admin from being able to create an account to go and access a dealerships customer and vehicle database, something the client asked platform admins to not be able to do."

#### CR-056

- **Section:** Site Fixes and Changes
- **Statement:** Admins must be able to remove pending accounts.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: Admins should be able to remove pending accounts."

#### CR-057

- **Section:** Site Fixes and Changes
- **Statement:** Admins must be able to edit a pending account's email, phone, and username when the creation details were entered incorrectly.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: Pending accounts should be able to be edited in some way by admin, such as email, phone, username, in the event that account creation information was accidentally input incorrectly."
- **Place named:** "Logged in as platform admin > pending accounts."

#### CR-058

- **Section:** Site Fixes and Changes
- **Statement:** The admin audit log should put search options and columns in the same order, and should be searchable by the change that was made.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: Admin audit log should have search options and columns should be in the same order. Additionally admin should also be able to search based on changes."

#### CR-059

- **Section:** Site Fixes and Changes
- **Statement:** Admin audit-log search should match partial input, and its day pickers should be labeled.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: Searches in admin audit log should return results when partial searches are entered. Additionally, as mentioned earlier the day picker boxes are unlabeled." The day-picker labeling is also stated in CR-026.

#### CR-060

- **Section:** Site Fixes and Changes
- **Statement:** A platform admin must be able to delete a dealership, and deletion must take at least one extra confirmation step.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: Dealerships should be able to be deleted by platform admin; however, this should be a more complex decision requiring at least one extra step to confirm."
- **Place named:** "Logged in as platform admin > Dealerships > Edit."

#### CR-061

- **Section:** Site Fixes and Changes
- **Statement:** An admin must be able to delete a user, and deletion must take at least one extra confirmation step.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: Admins should be able to delete users; however, this should be a more complex decision requiring at least one extra step to confirm."

#### CR-062

- **Section:** Site Fixes and Changes
- **Statement:** An admin must be able to edit some account information, such as email or phone number.
- **Author marker:** Changes (same paragraph as CR-061)
- **Change type:** Not stated
- **Source:** "Additionally, admin should be able to edit some information on accounts, such as email or phone number."

#### CR-063

- **Section:** Site Fixes and Changes
- **Statement:** The sample ads on the home page should link to sign-up instead of sign-in.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: The sample ads on the home page link to the sign in page. I believe most people who are clicking on the ads are potential users and this should link to the sign-up page."
- **Place named:** "Home page."

#### CR-064

- **Section:** Site Fixes and Changes
- **Statement:** The home page should say more prominently that it is for dealerships and not for customers.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: I feel like there should be something bigger on the home page saying that that page is for dealerships and not customers."
- **Place named:** "Home page."

#### CR-065

- **Section:** Site Fixes and Changes
- **Statement:** The dealership shop page should not say "used," because dealerships also hold and sell new vehicles.
- **Author marker:** Changes
- **Change type:** Not stated as removed, modified, or clarified. The sentence says the page "shouldn’t say “used”."
- **Source:** "Changes: The dealership shop page shouldn’t say “used” as many dealerships hold and sell new vehicles."
- **Place named:** "Home page > shop vehicles."

#### CR-066

- **Section:** Site Fixes and Changes
- **Statement:** The dealership shop page should let a visitor search for dealerships and should show each dealership's address and some contact information.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: I suggest that there should be a way to search for dealerships on the dealership shop page. Additionally, I believe it would be good to list dealerships address and some contact information on each of the dealerships on the page."
- **Place named:** "Home page > shop vehicles." The document does not say which contact fields.

#### CR-067

- **Section:** Site Fixes and Changes
- **Statement:** The dealership buyer site should have a back button and a way to search that dealership's inventory for a specific vehicle.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: There should be a back button in the dealership buyer site. Additionally there should be a way to search a dealerships inventory for a specific vehicl." The last word is printed as "vehicl".
- **Place named:** "Home page > shop vehicles > click any dealership."

#### CR-068

- **Section:** Site Fixes and Changes
- **Statement:** While asking about a vehicle, the character limit should become visible as the text gets closer to that limit.
- **Author marker:** Changes
- **Change type:** Not stated
- **Source:** "Changes: When asking about a vehicle, the character limit should be visible when it becomes closer."
- **Place named:** "Home page > Shop vehicles > click on any dealership > Ask about this vehicle." The document does not state the limit.

## Assumptions, dependencies, and open questions

These are only the points the document itself states. They are not extra product decisions.

### Priority the document states

- Client requests "must be completed first."
- Site fixes and other changes "are less urgent than the client requests but should still be implemented, especially the fixes."

### Explicit discussion points and optional scope

- Home-page account creation "being done a different way" still "need[s] to [be] discuss[ed] further with the client." Until then, "removing the button to create account from the home page will suffice." (CR-009)
- The dealership admin/owner/regional-manager account "is optional and should likely be discussed further with the client before full implementation occurs." (CR-010)
- For sortable columns, the author writes: "if you feel any other columns that I haven’t listed should be sortable feel free to add that functionality." (CR-011)
- Full-name clashes were found in three places, "but there may be more." (CR-021)
- The search-box list "may not be all the boxes needing changes." (CR-029 through CR-040)
- Limiting model years to the selected vehicle may be "too hard to implement for every vehicle"; the stated fallback is "only implementing it for common vehicles." (CR-033)
- A DMS column for the number of leads is a "possible addition," not a separate required column. (CR-050)

### Constraints and reasons the document gives

- People share full names, so a used full name must not block account creation. (CR-021)
- The author ranks privilege from most to least as: Platform admin; Dealership admin/owner/regional manager; Dealership manager; Dealership staff; User not logged in. (CR-010)
- The client asked that platform admins not be able to "access a dealerships customer and vehicle database." The document gives that as the reason a platform admin may only send a join request. (CR-055)
- Dealership-profile edits are called "a larger change" that should be confirmed before save. (CR-023)
- Dealership deletion and user deletion are each "a more complex decision requiring at least one extra step to confirm." The document does not describe that step. (CR-060, CR-061)
- Shared phone numbers are the stated reason customer phones should not be exclusive. (CR-046)
- The author believes sample-ad clicks are mostly potential users, and that dealerships sell new vehicles as well as used ones. (CR-063, CR-065)

### Details the document leaves unnamed

The document does not call these open questions, and it does not resolve them:

- Which employee fields a manager may edit. (CR-007)
- Which sales metrics appear for each sales employee. (CR-005)
- Which admin capabilities the optional dealership admin/owner/regional-manager account would have, beyond changing things for a single dealership "like the platform admin account." (CR-010)
- Which label is "the appropriate label" when a lead closes because the vehicle was sold. (CR-052)
- Which contact details appear on the shop-page dealership list. (CR-066)
- What the character limit is on "Ask about this vehicle." (CR-068)

## Item count

68 distinct items: CR-001 through CR-020 under Client Requests, and CR-021 through CR-068 under Site Fixes and Changes.
