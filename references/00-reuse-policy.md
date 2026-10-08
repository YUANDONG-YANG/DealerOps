# Reuse policy: copy interaction, do not fork

## Conclusion

The web has many dealership / DMS / CRM course projects. Against this course (Java + Vue 3 + Element Plus, admin-issued username/password, four repos, five pages + assistant widget): **none of them can be a whole-repo base**.  
You may compare page rhythm. Do not pull someone else's domain model, login, buyer site, or scaffold into this course's repos.

## Course boundary (coding must not expand this)

| Item | This course |
|----|------|
| Repos | `dealer-web` / `dealer-gateway` / `dealer-core` / `ai-service` (plus the platform repo) |
| Frontend | Vue 3 + Element Plus; English UI |
| Identity | Admin-issued username/password; `dealer-core` signs the JWT (`design/15-Data-Auth-and-Gateway.md` §8) |
| Roles | `Platform.Admin`, `Dealer.User` |
| Pages | Login, Admin, DMS, CRM, Ad compliance, plus a floating Assistant widget on staff pages |
| AI | In-process reuse of the private `ai-manager` JAR; see [03-ai-manager.md](03-ai-manager.md) |
| Compliance | Write our own fixed rules + AI review; OMVIC **has no ready-made checker to copy**; see [02-omvic.md](02-omvic.md) |

## You may copy

- Lists: one filter row, table, status Tag, text-link action column, about 10 rows per page.
- Forms: drawer / Dialog, enum Select, sell confirm.
- Empty / loading / error states. Failures must not look like an empty table.
- **Information density** of Admin dealership tables and inventory tables (few columns, few actions).
- Official Element Plus usage (Table, Drawer, Result, Empty). Use `vue-element-plus-admin` as a Demo only, not as scaffolding.

## Explicitly forbidden

- **Buyer site / marketplace / public storefront**
- **KPI / chart wall / dashboard home**
- **Leads, funnels, test drives, work orders, service tickets**
- **Self-registration, email verification, password reset**; any login flow other than `design/15-Data-Auth-and-Gateway.md` §8
- **Dark glassmorphism** and flashy dark dashboard skins
- Whole-repo forks, generic CRUD generators, Odoo modules, C++ consoles, MERN packs unrelated to this stack
- Copying a reference project's `com.gateway` / buyer APIs / password filters into this course

## Hard constraints for later AI work

1. Read this file and the effective `design/` docs before changing code.
2. Extra features in a reference repo → record them in [01-github-repos.md](01-github-repos.md). **Do not auto-implement them.**
3. Fields follow `design/00-Current-Development-Design.md` only. Do not add mileage/color/extra prices just because a reference repo has more fields.
4. Do not recommend or run "clone repo X as a template".
