# Multi-Region Support — Task Tracker

> Companion to `REGION_IMPLEMENTATION_PLAN.md`. Each task is checked off as it is completed.
> Status legend: `[ ]` pending • `[~]` in progress • `[x]` done • `[!]` blocked

---

## Phase 1 — Database & Migration

- [ ] **1.1** Add `Region` model to `prisma/schema.prisma`
- [ ] **1.2** Add `regionId String?` + relation + `@@index([regionId])` to:
  - [ ] `User` (admin assignment, relation name `UserAssignedRegion`)
  - [ ] `Customer`
  - [ ] `B2CCustomer`
  - [ ] `Cylinder`
  - [ ] `Expense`
  - [ ] `OfficeExpense`  (also update `@@unique([type, month, year])` → `@@unique([regionId, type, month, year])`)
  - [ ] `SalaryRecord`
  - [ ] `DailyPlantPrice`
  - [ ] `Product`
  - [ ] `CustomItem`
  - [ ] `Store`
  - [ ] `Vehicle`
  - [ ] `PurchaseEntry`
  - [ ] `VendorPayment`
  - [ ] `VendorOrder`
  - [ ] `VendorInventory`
  - [ ] `VendorFinancialReport`
  - [ ] `B2BTransaction`
  - [ ] `B2CTransaction`
- [ ] **1.3** Generate Prisma migration (`npx prisma migrate dev --name add_regions`)  *(user-invoked)*
- [ ] **1.4** Create `scripts/backfill-regions.js` to:
  - [ ] Upsert "Hayatabad Branch" (default region)
  - [ ] Backfill `regionId` on every scoped table
  - [ ] Backfill all existing `ADMIN` users' `regionId` to Hayatabad
  - [ ] Print per-table counts
- [ ] **1.5** Run backfill script and verify counts  *(user-invoked)*

---

## Phase 2 — Core Region Plumbing

- [ ] **2.1** Create `src/lib/region.ts` with:
  - [ ] `getRegionIdFromRequest()`
  - [ ] `requireRegionId()` (throws on missing)
  - [ ] `regionScopedWhere()`
  - [ ] `getActiveRegions()`
  - [ ] Cookie name constant `FLAMORA_REGION_COOKIE`
- [ ] **2.2** Update `src/proxy.ts`:
  - [ ] Read `flamora_region_id` cookie
  - [ ] Redirect authenticated users without region → `/select-region`
  - [ ] Inject `x-region-id` header into `/api/*` requests
  - [ ] Whitelist `/select-region`, `/api/admin/regions/*`, `/api/auth/*`, `/api/notifications/*`
- [ ] **2.3** Region CRUD APIs:
  - [ ] `src/app/api/admin/regions/route.ts` — `GET` (role-aware), `POST` (super-admin)
  - [ ] `src/app/api/admin/regions/[id]/route.ts` — `GET`, `PATCH`, `DELETE` (super-admin for write)
  - [ ] `src/app/api/admin/regions/select/route.ts` — `POST` (set cookie, role-checked), `DELETE` (clear)
  - [ ] `src/app/api/admin/regions/current/route.ts` — `GET`
- [ ] **2.4** Extend admin team API:
  - [ ] `src/app/api/admin/team/[id]/route.ts` — add `PATCH` for `{ regionId, isActive }` (super-admin only)
  - [ ] `src/app/api/admin/team/route.ts` — include `regionId` + `region` on list/get; accept `regionId` on POST

---

## Phase 3 — UI: Select-Region & Region CRUD

- [ ] **3.1** Create `src/app/select-region/layout.tsx` (bare layout, no DashboardLayout)
- [ ] **3.2** Create `src/app/select-region/page.tsx`:
  - [ ] Branded gradient background, logo, heading
  - [ ] `SUPER_ADMIN`: card grid of all active regions + "Manage regions" link
  - [ ] `ADMIN`: shows only their assigned region (one-click confirm)
  - [ ] `ADMIN` with no `regionId`: "Access not assigned" empty state
  - [ ] Selecting → POST `/select` → redirect to `callbackUrl` or `/dashboard`
  - [ ] Sign-out escape hatch
- [ ] **3.3** Create `src/components/region/RegionSwitcher.tsx`:
  - [ ] `SUPER_ADMIN`: pill + dropdown listing all regions, plus "Manage regions" entry
  - [ ] `ADMIN`: read-only pill (no dropdown), tooltip "Your branch — contact super admin to change"
- [ ] **3.4** Update `src/components/layouts/DashboardLayout.tsx`:
  - [ ] Mount `<RegionSwitcher />` between logo and navigation
  - [ ] Add "Regions" entry to `superAdminNavigation`
- [ ] **3.5** Create `src/app/(dashboard)/admin/regions/page.tsx`:
  - [ ] Header + "Add Region" button
  - [ ] Search input
  - [ ] Table with Edit / Delete actions
  - [ ] Add / Edit Dialog
  - [ ] Delete confirmation Dialog with friendly error on linked rows
  - [ ] Page-level role check: `SUPER_ADMIN` only
- [ ] **3.6** Update `src/app/(dashboard)/admin/team/page.tsx`:
  - [ ] Add "Assigned Region" required dropdown to "Add Admin" dialog
  - [ ] Show region badge / "Unassigned" badge in each row
  - [ ] Add "Assign / Reassign region" action (small dialog)
  - [ ] Add "Revoke access" action (sets `isActive=false`, `regionId=null`)

---

## Phase 4 — Wire Existing Endpoints to Region Scope

For each route below: add filter on reads + inject `regionId` on writes.

### Customers
- [ ] **4.1** `src/app/api/customers/route.ts`
- [ ] **4.2** `src/app/api/customers/b2b/route.ts`
- [ ] **4.3** `src/app/api/customers/b2b/[id]/route.ts`
- [ ] **4.4** `src/app/api/customers/b2b/[id]/transactions/route.ts` (and any sub-routes)
- [ ] **4.5** `src/app/api/customers/b2b/transactions/route.ts`
- [ ] **4.6** `src/app/api/customers/b2c/route.ts`
- [ ] **4.7** `src/app/api/customers/b2c/[id]/route.ts`
- [ ] **4.8** `src/app/api/customers/b2c/transactions/route.ts`
- [ ] **4.9** `src/app/api/customers/b2c/ledger/route.ts`
- [ ] **4.10** `src/app/api/customers/combined/route.ts`
- [ ] **4.11** `src/app/api/customers/export/route.ts`
- [ ] **4.12** `src/app/api/customers/import/route.ts`
- [ ] **4.13** `src/app/api/customers/[id]/route.ts`

### Inventory
- [ ] **4.14** `src/app/api/cylinders/route.ts`
- [ ] **4.15** `src/app/api/inventory/cylinders/route.ts` (+ `[id]`, `stats`)
- [ ] **4.16** `src/app/api/inventory/custom-items/route.ts` (+ `[id]`, `category`)
- [ ] **4.17** `src/app/api/inventory/accessories/route.ts`
- [ ] **4.18** `src/app/api/inventory/categories/route.ts`
- [ ] **4.19** `src/app/api/inventory/customer-cylinders/route.ts`
- [ ] **4.20** `src/app/api/inventory/empty-cylinders/route.ts`
- [ ] **4.21** `src/app/api/inventory/check/route.ts`
- [ ] **4.22** `src/app/api/inventory/cylinder-types/route.ts`
- [ ] **4.23** `src/app/api/inventory/stats/route.ts`
- [ ] **4.24** `src/app/api/inventory/stores/route.ts`
- [ ] **4.25** `src/app/api/inventory/vehicles/route.ts`

### Financial
- [ ] **4.26** `src/app/api/expenses/route.ts`
- [ ] **4.27** `src/app/api/financial/expenses/route.ts` (+ `[id]`)
- [ ] **4.28** `src/app/api/financial/revenue/route.ts`
- [ ] **4.29** `src/app/api/financial/profit/route.ts`
- [ ] **4.30** `src/app/api/financial/salaries/route.ts`
- [ ] **4.31** `src/app/api/financial/summary/route.ts`

### Dashboard / Reports / Pricing
- [ ] **4.32** `src/app/api/dashboard/stats/route.ts`
- [ ] **4.33** `src/app/api/reports/**/route.ts`
- [ ] **4.34** `src/app/api/admin/plant-prices/route.ts`
- [ ] **4.35** `src/app/api/pricing/route.ts`
- [ ] **4.36** `src/app/api/reconciliation/**/route.ts`

### Vendors (vendor list itself is global; activity is region-scoped)
- [ ] **4.37** `src/app/api/vendors/route.ts` — vendor list stays global (verify no regionId filter)
- [ ] **4.38** `src/app/api/vendors/[id]/orders/route.ts` — region-scoped reads/writes
- [ ] **4.39** `src/app/api/vendors/[id]/payments/route.ts` — region-scoped reads/writes
- [ ] **4.40** `src/app/api/vendors/[id]/inventory/route.ts` — region-scoped reads/writes
- [ ] **4.41** `src/app/api/vendors/[id]/financial-reports/route.ts` — region-scoped
- [ ] **4.42** `src/app/api/vendor-categories/route.ts` (intentionally global — verify only)

### B2B Transactions
- [ ] **4.43** `src/app/api/b2b-transactions/route.ts`

---

## Phase 5 — Verification & Polish

- [ ] **5.1** Manual smoke test: login as `SUPER_ADMIN`
  - [ ] Sees `/select-region` with full grid
  - [ ] "Hayatabad Branch" visible
  - [ ] Can create / edit / delete regions
  - [ ] Can switch regions from sidebar
- [ ] **5.2** Manual smoke test: login as `ADMIN` (with assigned region)
  - [ ] Sees `/select-region` showing only their region (one-click confirm)
  - [ ] After selection, dashboard scoped correctly
  - [ ] Sidebar pill is read-only
  - [ ] Cannot reach `/admin/regions` (gets 403 / redirect)
  - [ ] POST to `/select` with another region id → 403
- [ ] **5.3** Manual smoke test: login as `ADMIN` (with no assigned region)
  - [ ] Sees "Access not assigned" empty state
  - [ ] Sign-out works
- [ ] **5.4** Manual smoke test: SUPER_ADMIN assigns / reassigns / revokes admin
  - [ ] Assign empty admin → admin gains access
  - [ ] Reassign admin to new region → admin's data view changes
  - [ ] Revoke → admin sees "Access not assigned"
- [ ] **5.5** Verify CRUD per domain works in selected region:
  - [ ] Create B2B customer → only visible in its region
  - [ ] Create B2C customer → only visible in its region
  - [ ] Add cylinder, expense, vendor activity, etc. → same
- [ ] **5.6** Verify dashboard stats are region-scoped (KPIs, charts, recent activity)
- [ ] **5.7** Verify deleting a region with data is blocked
- [ ] **5.8** Verify default region cannot be deleted
- [ ] **5.9** Run `npm run lint` — fix new lint errors only
- [ ] **5.10** Run `npm run build` — confirm clean compile

---

## Phase 6 — Documentation (light)

- [ ] **6.1** Update `REGION_IMPLEMENTATION_PLAN.md` with any deviations
- [ ] **6.2** Add a short "Regions" section to `README.md` (operator-facing)

---

## Progress Notes

_Use this section as a running log while implementing._

- _(empty)_
