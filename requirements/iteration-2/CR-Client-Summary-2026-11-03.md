# Change request summary for the client — 3 November 2026

This note reports back on the change request dated 3 November 2026. It covers all sixty-eight requested
changes: sixty are finished, seven are finished in part, and one was deliberately built differently from
the way the document described it.

It is written for the people who wrote and will review the change request, so it describes what you will
see on screen rather than how it was built.

---

## 1. What was delivered

**Vehicle inventory and sales.** The inventory list now shows who sold each vehicle, who bought it and
the date of the sale. The sell screen shows the vehicle's cost, the total spent on work orders and the
list price before the sale is confirmed, so the person selling can see the margin. The inventory filters
were tidied up: the duplicate Make and Model boxes are gone (the search box already covers them), Year is
now typed instead of picked from a long list, the VIN box sits at the top of the add-vehicle form, the
make list is split into popular makes and all makes, and there is a new filter for vehicles with open
work orders. Model-year choices are narrowed for a set of common make and model pairs. Each vehicle now
shows its leads, and the list has a leads count column. Every column named in the request can be sorted,
and sorting works across the whole filtered list, not just the page on screen.

**Customers.** The "Vehicles purchased" column has been replaced by a leads count. A customer record now
holds free-text notes, and a lead can be created directly from the open customer. When a new customer
matches an existing one on name, email, phone or address, the system warns and asks for confirmation
instead of refusing.

**Leads.** The owner of a new lead defaults to the person creating it and can still be changed. Customer
and vehicle are now chosen with the same type-ahead picker used elsewhere, and there are new search boxes
for vehicle and for customer name that filter as you type. A closed lead can be reopened. A second open
lead for the same customer and the same vehicle is refused. Selling a vehicle now closes that vehicle's
open leads automatically.

**Sales report.** The report and the dashboard sales section both offer Today, This week, This month and
This year, and the figures reload for the chosen period. A new table lists each salesperson with their
sold count, revenue, gross profit, open leads and won leads. Owners and managers who sell appear in it
too, since they also close deals.

**The team and its roles.** The dealership now has three levels — Owner, Manager and Sales — described in
section 2. Team > Members shows the date each person joined. Join requests are split into a Pending table
and a History table. The activity log has labelled From and To date boxes, a free-text search over the
recorded change (so searching "password" finds password sign-ins), partial-match search on the person's
name, and the filters now follow the column order. Leaving an edit screen with unsaved changes asks for
confirmation, and saving the dealership profile or closing a lead asks before it commits.

**The platform administrator.** The administrator can now remove and edit pending accounts, edit a
member's sign-in email and phone, delete a member account, and delete a dealership. Both deletions
require the name or username to be typed out first, and both keep sale and audit history. The audit log
received the same search, sorting and labelling improvements as the team activity log. An unacceptable
username now produces a plain-English message instead of a technical one, and "Display name" is now
labelled "Full name" everywhere.

**The public website.** The create-account buttons have been removed from the home page, and a banner
above the hero states plainly that Dealer Ops is software for dealerships, not a place to buy a car. The
shop no longer calls the inventory "used". The dealership directory can be searched by name and address
and shows each dealership's address, phone and email. A dealership page has a back link and an inventory
search by year, make and model. The vehicle enquiry form now shows the remaining character count as the
limit approaches.

---

## 2. The new dealership roles

The change request described "a dealership specific admin/owner/regional manager account that has some
admin capabilities ... but is exclusive to a single dealership". We read those three names as **one
role** and built it as the dealership **Owner**. No cross-dealership regional manager exists: an owner
runs one dealership and sees only that dealership's data.

| | Owner | Manager | Sales |
|---|---|---|---|
| Appointed by | The platform administrator | The owner | The owner or a manager |
| Vehicles, customers, leads, work orders, selling | yes | yes | yes |
| Open the Team area and its activity log | yes | yes | no |
| Edit the dealership profile | yes | no | no |
| Approve or reject join requests | yes | no | no |
| Promote a salesperson to manager | yes | yes | no |
| Demote a manager back to sales | yes | no | no |
| Edit a colleague's full name and phone | anyone below owner | sales only | no |
| Remove a colleague | managers and sales | sales only | no |

Each dealership has exactly one active owner, and nobody can change their own role. The last remaining
owner cannot be demoted or removed until a successor is appointed, so a dealership is never left without
one. When the platform administrator appoints a new owner, the sitting owner becomes a manager in the
same step.

**Why the administrator can create the first owner but not later staff.** You asked that platform staff
should not be able to attach themselves to a dealership and reach its customers and vehicles. So once a
dealership has an owner, anything the administrator does to add a person becomes a **join request** that
the owner approves in Team > Join Requests — the dealership decides who gets in. The one exception is a
brand-new dealership: it has nobody to approve anything yet, so the administrator creates and attaches
the first owner directly. After that the normal rule applies.

The change request itself called this role optional and said it should be discussed further. We built the
minimum it describes: the owner can edit a colleague's full name and phone, and nothing more. The owner
deliberately **cannot** change a colleague's sign-in email, delete a user account, or manage pending
accounts — those remain with the platform administrator, because an owner who can change a sign-in email
could take over a colleague's account. Widening this needs your decision.

---

## 3. Where we did something different, and why

**Home-page sample adverts still lead to sign-in.**
The document asks: *"The sample ads on the home page link to the sign in page. I believe most people who
are clicking on the ads are potential users and this should link to the sign-up page."* A few pages
earlier the client asks that *"removing the button to create account from the home page will suffice"*.
These two pull in opposite directions: an advert pointing at sign-up would put the create-account entry
straight back on the home page. We kept the client's instruction and left the adverts on sign-in ("Sign
in to check your own ads"). Once the dealership enquiry page exists, the adverts would be a natural place
to send an interested dealership instead — that is an option open to you.

**Full names and customer phone numbers are no longer unique.**
The document reports: *"Currently an account is unable to be created if the full name is already used.
Many people have the same name"*, and separately that *"phone numbers are exclusive for customers, I feel
they shouldn't be as some people share a phone number"*. Both rules were intentional, and both have been
removed. A repeated full name is now simply accepted. A new customer that matches an existing one on
name, email, phone or address raises a warning that names the matching field and asks for confirmation,
then creates the record. Sign-in usernames and account email addresses remain unique, because they
identify a login.

**A sale must name a buyer.**
The document asks that *"the vehicle sale is required to link to a customer before it can be sold, with
the option to pick 'other' and manually type in a buyer"*. This is implemented exactly as written: a sale
cannot be saved without either a customer record or "Other" plus a typed name. A typed name is recorded
on the sale for the "Sold to" column, but it does not create a customer record, so it will not appear in
your customer list or pick up a purchase history.

**Automatic closing and reopening of leads.**
The document asks for both: *"When a vehicle is sold to a customer, they should be automatically closed
with the appropriate label applied"*, and *"There should be a way to reopen leads that are closed ... in
the case of something like an accidental closure"*. Taken literally, the two allow a lead marked won by a
recorded sale to be reopened afterwards, which would contradict the sale. Our rules:

- Selling a vehicle marks the buyer's lead **Won** and every other open lead on that vehicle **Lost**,
  with the reason "Vehicle sold". When the buyer was typed in as "Other", all open leads on the vehicle
  become Lost.
- A lost lead can always be reopened. A won lead can be reopened only when the vehicle was not actually
  sold to that lead's customer.
- Only one *open* lead may exist per customer and vehicle. A closed lead does not block a new one, since
  a shopper who walked away may well come back.

The sentence *"the appropriate label applied to the customers tied to the lead"* was not clear enough to
act on, so the lead stage (Won or Lost) is what gets set. Nothing is written onto the customer record. If
you intended a visible marker on the customer, tell us what it should say.

---

## 4. What we need the client to decide

These are the places where the change request left room for more than one reading. Each was given a
working default so the release could go ahead; your answer can change it.

1. **What should "VINs should be forced to match vehicle information" actually check?** We currently
   verify that the model-year character inside the VIN agrees with the year entered. We do not force the
   make and model to agree with the VIN, because that needs a live lookup every time a vehicle is saved.
   Is the year check enough, or should make and model be locked to the VIN as well?

2. **What does "the Carfax box should be exclusive" mean?** We read it as "only accept genuine Carfax
   links", so any address that is not a secure carfax.com or carfax.ca link is refused. The other
   possible reading is that one Carfax link may be used by only one vehicle. Which did you mean? And
   should a Carfax link be required rather than optional?

3. **Two people sharing a phone number on the public website.** When someone enquires about a vehicle on
   a dealership's public page, we decide whether they are an existing customer by matching the phone
   number **and** the name. So a husband and wife sharing one number get two separate customer records.
   Is that what you want, or should one phone number always mean one customer?

4. **Which columns does "Location" refer to in the activity log?** The request lists a Location column
   for both the team activity log and the administrator audit log. We have made the location shown
   alongside each entry sortable. Please confirm that is the column you meant, and tell us whether the
   administrator log should also keep its Source IP and Dealership columns, which your list leaves out.

5. **How should the dealership enquiry replace account creation?** The create-account buttons are gone
   from the home page, as asked. The enquiry path that replaces them has not been designed. We need to
   know what a dealership should be asked for (dealership name, contact person, phone, email, how many
   vehicles, anything else), who receives the enquiry and what happens next, and whether the existing
   self-registration page should be closed off entirely at that point.

A smaller open point: the Members "Joined" column currently shows the date a person **first** joined the
dealership. Someone who left and came back keeps that original date. Say the word if the most recent join
date would be more useful.

---

## 5. Known limits

**Sales recorded before this change have no salesperson.** The salesperson was not stored on a sale until
now. We filled in the older sales from the activity history wherever a matching record existed, but a
small number of historical sales have no usable history, so they will show no salesperson. Those sales
still count in the overall totals, which means the per-salesperson rows may add up to slightly less than
the headline figure for older periods. Sales recorded from now on always carry a salesperson.

**The dealership enquiry page is not built.** The home page no longer offers account creation, and
nothing yet collects an enquiry from a dealership interested in the service. This is waiting on decision
4 above. The existing self-registration page is still reachable from the sign-in screen in the meantime,
so invited dealerships are not locked out.

**Saving is not confirmed, only discarding.** Leaving an edit screen with unsaved changes now asks before
the changes are thrown away. An ordinary save goes through immediately and shows a success message. Only
the two cases the document singled out — saving the dealership profile, and closing a lead — ask for
confirmation before saving. A confirmation on every save would add a click to routine daily work.

**Duplicate leads are prevented in the application, not in the stored data.** Two people saving the same
new lead at the very same instant could both get through. In normal use this does not occur.

**Deletions keep history.** Deleting a dealership or a user account hides it rather than erasing it, so
past sales and the audit trail stay intact and readable.
