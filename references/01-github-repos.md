# GitHub repository comparison

**Conclusion: copy interaction only. Do not fork.** Use the table below when you need links while coding.

## Inventory / CRM (compare these first)

| Repo | What you may copy | What you must not copy | Links |
|------|----------|------------|------|
| hyundai_dms | Column density and action rhythm of Admin dealership and vehicle tables (Dealers / Cars) | Whole Firebase/React repo, buyer or brand-course business, home-grown accounts | [Navpreet0981/hyundai_dms](https://github.com/Navpreet0981/hyundai_dms) · [Dealers.jsx](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Dealers.jsx) · [Cars.jsx](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Cars.jsx) |
| carventory | Staff-console inventory list/filter density; Java layering is **read-only** (how entity/DTO/Service split), do not migrate the DB | marketplace buyer site; home-grown password JWT; PostgreSQL+Flyway mixed with `ddl-auto`; booking/invoice; React-to-Vue port | [mohammadumar-dev/carventory](https://github.com/mohammadumar-dev/carventory) |
| dealership-management-system | Menu split intuition for "dealership + cars + customers" | Whole-repo business, stack and fields that do not match this course | [alamariful1727/dealership-management-system](https://github.com/alamariful1727/dealership-management-system) |
| dealership-sales | Rhythm of seeing car and customer side by side on a sales list | Sales funnel, commissions, reports as the home page | [emanuelmachado1983/dealership-sales](https://github.com/emanuelmachado1983/dealership-sales) |
| Car-Mart-Frontend | `EntityPage`-style "filter + table + modal CRUD" skeleton | Generic CRUD generator as the product; home-grown login | [saadshd/Car-Mart-Frontend](https://github.com/saadshd/Car-Mart-Frontend) · [EntityPage.tsx](https://github.com/saadshd/Car-Mart-Frontend/blob/main/src/components/crud/EntityPage.tsx) |
| MEVN-MyCar | List/form rhythm; there is a [demo video](https://vimeo.com/500102464) you can skim | Whole MEVN repo, Mongo models, modules unrelated to this course | [SebastianPintos/MEVN-MyCar](https://github.com/SebastianPintos/MEVN-MyCar) |
| ism-motors-dealership-dashboard | Information density of back-office table pages (if still a light table layout) | **Dark glassmorphism / KPI wall**; using it as scaffolding | [RafaellsAlmeida/ism-motors-dealership-dashboard](https://github.com/RafaellsAlmeida/ism-motors-dealership-dashboard) |

If `carventory/` is already cloned locally: open the staff console only to inspect interaction. **Do not** inspect or migrate `apps/marketplace`.

## Searched and rejected (one line each)

| Type / example | Why not |
|-------------|------------|
| Various **MERN** dealership full-stack course projects | Wrong stack; often bundled with a buyer site, leads, and local JWT. Interaction is already covered above. |
| **C++** console/desktop dealership homework | No Web interaction to copy. Domain models cannot be this course's schema. |
| **Odoo** Automotive / Fleet / CRM modules | Full ERP suite. Cannot be the base for a four-microservice course. License and customization cost also do not fit. |
| Laravel **car-dealer-crm** class (local or previously cloned) | Vue lists may be glanced at. Do not migrate Laravel/Sanctum/order supply chain. Do not paste source until the license is reviewed file by file. |
| Admin templates such as `vue-element-plus-admin` | The [Demo](https://element-plus-admin.cn/) can show layout. **Do not use the whole repo as scaffolding** (menus/permissions/dark theme will expand scope). |
| Element Plus docs | Component usage may be copied: [Result / Table / Empty](https://element-plus.org/en-US/component/result) |

## Open order while coding (interaction only)

1. hyundai_dms `Dealers.jsx`, `Cars.jsx`
2. Car-Mart `EntityPage.tsx`
3. carventory **staff console** (do not look at marketplace)
4. Official Element Plus Table / Drawer / Result / Empty
5. Watch the MEVN-MyCar video only if you need motion reference

Then **rewrite** the five pages and the assistant widget with Element Plus. Do not port JSX/React/Laravel.
