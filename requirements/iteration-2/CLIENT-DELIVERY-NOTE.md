# Client delivery note

Source: `requirements/iteration-2/Changes Document.docx` (Jackson Warga, 2026-11-03).

Audience: the client and the capstone team.

Client requests in section 1 outrank author suggestions in section 2. That rule applies where section 2 says "I believe" or "I suggest".

Of the 8 items previously listed as partial or contradicted, all 8 are now accepted decisions. CR-063 was reopened on 2026-11-03 and is implemented as the document asked.

## Accepted decisions

### CR-009 — Home page Create account

Done for the current client instruction. The client wrote: "For now, removing the button to create account from the home page will suffice." The dealership-inquiry flow is explicitly still to be discussed. `/register` remains for other entry points. The home page has no Create account button.

### CR-022 — Save confirmation

Ordinary save does not ask for confirmation, on purpose. The change document requires a save confirmation in two places only: dealership profile ("a larger change like this") and closing a lead. Both exist. Confirming every customer or vehicle save would add a needless click. Dirty-form discard confirms remain.

### CR-041 — Reopen a closed lead

Reopen of a closed lead is implemented, including decision D7. A lead closed because the vehicle was sold cannot be reopened, so a salesperson is not sent after a vehicle that is gone. Reopen still applies to an accidental close in other cases. Another open lead for the same customer and vehicle still blocks a second open lead.

### CR-047 — VIN and vehicle information

Known limit, recorded as a client decision. The text only says "VINs should be forced to match vehicle information" and gives no matching rule. The save checks that the VIN's 10th character matches the model year. A full make/model cross-check would call an external decode service on every save.

### CR-048 — Carfax URL

A non-empty Carfax URL must be https on carfax.com or carfax.ca. Blank is allowed because Carfax is optional; requiring it would block a normal vehicle save. "Exclusive" in the source is ambiguous. It was read as "only a real Carfax link," not as "globally unique." The client is asked which meaning they want (see open questions).

### CR-051 — One open lead per customer and vehicle

A second OPEN lead for the same customer and vehicle is blocked. A closed lead does not block a new lead. A returning customer must be able to start a new lead. Using a closed lead to block a new one would turn the customer away.

### CR-052 — Sale closes related leads

Selling a vehicle closes related open leads. The CRM buyer is Won; other open leads on that vehicle are Lost. Won and Lost are the label. The source sentence is unclear, and it does not require a separate tag on the customer record.

## Reopened and implemented

### CR-063 — Sample ads

Done as written, after a reversal. This was first recorded as a deliberate departure, on the reading that an ad pointing at `/register` would restore the create-account entry section 1 asked to remove. On re-reading, the two asks are about different elements: section 1 names the create-account **button**, and says nothing about where a sample ad should lead; section 2's line is a usability note about the ad. Keeping the ad on sign-in also served nobody, since a dealership evaluating the product reached a page it had no account for while `/register` stayed reachable from sign-in anyway. The expanded sample ad now ends with "Check your own ads" to `/register`. The create-account button stays removed.

## Waiting on the client

When the dealership inquiry page from CR-009 is defined, the sample ad should point at it instead of at sign-up. That is the intended end state: it matches "potential dealers should inquire" and stops sending new traffic into self-service registration, which the client wants to replace. Until then the sign-up link is the interim.

## Questions still open

These are questions for the client. They are not a request to build more now.

- What is the dealership inquiry flow (which fields, who receives it, and whether it creates an account)?
- What must "VIN matches vehicle information" compare (year only, or make and model via decode, and what happens when decode is down)?
- What does Carfax "exclusive" mean (Carfax host only, or one URL per vehicle / per dealership)?
- May two customers share a phone and still be separate records? Current behavior allows a shared customer phone after a confirm; account phones stay unique. Please confirm.

## Already delivered

Client-request items already in the product include the DMS sold columns, the sell dialog (cost, work-order spend, and list price), sales periods, salesperson metrics, the owner / manager / sales roles, the first owner bound by the platform admin, and removal of the home Create account button.

The item-by-item record is `requirements/iteration-2/implementation-check/IMPLEMENTATION-CHECK-SUMMARY.md`.
