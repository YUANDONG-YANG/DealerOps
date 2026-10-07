# 01 Roles and Multi-Tenancy

## 1. Source points (PDF §1, §2, §6)

- Multi-tenant web application for independent used-car dealers.
- A single platform admin provisions dealer businesses and issues login credentials.
- A dealer may hold several credentials (one per staff member); all share that dealer's data.
- Each account links to **exactly one** dealer; every write from that account is scoped to that dealer.
- The platform admin has **no visibility** into any dealer's DMS / CRM / ad data.

## 2. Roles

| Role | Code | Count | Belongs to |
|---|---|---|---|
| Platform admin | `Platform.Admin` | Platform-level; the source says "a single" admin | No dealer |
| Dealer user | `Dealer.User` | N per dealer | Exactly one dealer |

The source does not distinguish managers from salespeople; all users inside a dealer have the same permissions.

## 3. Permission matrix

| Action | Platform.Admin | Dealer.User (own dealer) | Dealer.User (other dealer) |
|---|---|---|---|
| Create dealer | ✅ | ❌ | ❌ |
| List dealers | ✅ | ❌ | ❌ |
| Create / view / remove logins | ✅ | ❌ | ❌ |
| Vehicles (DMS) create / edit / view | ❌ | ✅ | ❌ (appears not to exist) |
| Customers (CRM) create / edit / view | ❌ | ✅ | ❌ |
| Ad check | ❌ | ✅ | ❌ |
| View audit history | ❌ | ✅ | ❌ |

## 4. Requirements

| ID | Requirement | Source | Priority |
|---|---|---|---|
| AUTH-01 | The system has exactly two roles: platform admin and dealer user | PDF §2 | Must |
| AUTH-02 | The admin can create a dealer (at minimum: registered name and contact info, used by the ad-compliance "dealer's registered name and contact info" rule) | PDF §2, §5 | Must |
| AUTH-03 | The admin can create a login for a dealer; one login binds to one dealer | PDF §2 | Must |
| AUTH-04 | The admin can view the list of logins for a dealer | PDF §2 | Must |
| AUTH-05 | The admin can remove a login; the account immediately loses access to dealer data | PDF §2 | Must |
| AUTH-06 | All logins of one dealer read and write the same data; a vehicle entered by staff A is immediately visible to staff B | PDF §1 | Must |
| AUTH-07 | A dealer user cannot see any other dealer's data; requesting another dealer's record id returns "not found" (404) and does not reveal whether it exists | PDF §2, SCOPE | Must |
| AUTH-08 | The admin is rejected (403) on every business API, with no business fields in the response | PDF §2, §6 | Must |
| AUTH-09 | The server derives the dealer from the signed-in identity and **ignores** any client-supplied `dealerId` | Derived | Must |
| AUTH-10 | Dealer users cannot create or remove logins | PDF §2 | Must |
| AUTH-11 | Each user signs in with their own identity; no shared accounts | PDF §2 | Must |
| AUTH-12 | Sign-in uses the admin-issued username and password from the source; the server checks a BCrypt hash and issues a signed JWT. | PDF §2, §8, SCOPE erratum 1 | Must |
| AUTH-13 | A signed-in user with no dealer binding gets 403 on business APIs | SCOPE | Should |
| AUTH-14 | The same person cannot be bound to the same dealer twice (`DUP_MEMBER`) | SCOPE | Should |
| AUTH-15 | The admin can view / edit a single dealer's basic info | SCOPE (added in design doc 14) | Should |

## 5. Dealer entity fields

The source gives no dealer fields, but ad compliance requires "dealer's registered name and contact info", so at minimum:

| Field | Required | Notes |
|---|---|---|
| Registered name | ✅ | Used by compliance check and TXT export |
| Phone | ✅ | Contact info |
| Email | ✅ | Contact info |
| Address | ✅ | Contact info |

> These four fields are the "dealer public four fields" in SCOPE.

## 6. Account lifecycle

```
Admin creates dealer → Admin issues login (username + temporary password ↔ dealer) → User signs in → Accesses own dealer data
                                            ↓
                              Admin removes binding → User calls business API → 403
```

## 7. Edge cases

- After a login is removed, its historical audit entries are kept (the "acting user" must not be lost).
- The last login of a dealer is removed: the dealer's data stays, and a new login can be bound.
- An admin cannot also be a dealer user (roles are mutually exclusive), so "admin sees no data" cannot be bypassed.
