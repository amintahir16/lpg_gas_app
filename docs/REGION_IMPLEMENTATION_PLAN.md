# Multi-Region (Branch) Support — Technical Implementation Plan

> Author: Engineering • Status: Proposed • Target: `lpg_gas_app` (Next.js 16 + Prisma + PostgreSQL + NextAuth)

---

## 1. Goal

Introduce a first-class **Region** (a.k.a. *Branch*) concept so the LPG business can be operated as a multi-branch organisation:

1. After login, every user lands on a **Select Region** screen.
2. Once a region is selected, **all data (read & write) is scoped to that region**.
3. **`SUPER_ADMIN`** can create / edit / delete regions (full CRUD) and **switch between regions freely** at any time from the dashboard sidebar. They can also **assign / re-assign / revoke** admin access to specific regions.
4. **`ADMIN`** is **locked to a single region** assigned by a `SUPER_ADMIN`. They cannot switch to other regions. If no region is assigned, they see a friendly "no access" screen.
5. All current production data is migrated under a default region named **"Hayatabad Branch"** so nothing breaks.

---

## 2. High-level Architecture

```
                ┌────────────────────────┐
                │        Login           │
                └──────────┬─────────────┘
                           │ NextAuth JWT (role)
                           ▼
                ┌────────────────────────┐
                │  src/proxy.ts (mw)     │
                │  • Reads NextAuth JWT  │
                │  • Reads HttpOnly      │
                │    cookie `region_id`  │
                │  • If missing → /select-region
                │  • Else → injects      │
                │    x-region-id header  │
                └──────────┬─────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  Pages: /select-region, /admin/regions │
        │  API:   /api/admin/regions            │
        │  API:   /api/admin/regions/select     │
        │  All other APIs read x-region-id      │
        │  via lib/region.ts helpers            │
        └──────────────────────────────────────┘
```

**Data scoping pattern:**
- Each region-scoped Prisma model gains a `regionId String?` (nullable for migration safety, enforced at the application layer).
- Read endpoints add `where: { regionId }` automatically.
- Write endpoints inject `regionId` from the request header.

---

## 3. Database Schema Changes

### 3.1 New `Region` model

```prisma
model Region {
  id          String   @id @default(cuid())
  name        String   @unique
  code        String?  @unique     // e.g. "HYT", "ISB" — optional short code
  address     String?
  phone       String?
  description String?
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false) // exactly one region may be default
  sortOrder   Int      @default(0)
  createdBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Reverse relations
  users                  User[]                    @relation("UserAssignedRegion")
  customers              Customer[]
  b2cCustomers           B2CCustomer[]
  cylinders              Cylinder[]
  expenses               Expense[]
  officeExpenses         OfficeExpense[]
  salaryRecords          SalaryRecord[]
  dailyPlantPrices       DailyPlantPrice[]
  products               Product[]
  customItems            CustomItem[]
  stores                 Store[]
  vehicles               Vehicle[]
  purchaseEntries        PurchaseEntry[]
  vendorPayments         VendorPayment[]
  vendorOrders           VendorOrder[]
  vendorInventories      VendorInventory[]
  vendorFinancialReports VendorFinancialReport[]
  b2bTransactions        B2BTransaction[]
  b2cTransactions        B2CTransaction[]

  @@map("regions")
}
```

### 3.1.1 `User.regionId` — admin assignment

```prisma
model User {
  // ...existing fields...
  regionId   String?
  region     Region?  @relation("UserAssignedRegion", fields: [regionId], references: [id])

  @@index([regionId])
}
```

Semantics:
- `SUPER_ADMIN`: `regionId` is **ignored** — they have access to all regions.
- `ADMIN`: their `regionId` is their assigned branch. If `null`, they see "no access" until a SUPER_ADMIN assigns one.
- `USER` / `VENDOR`: `regionId` is meaningless and ignored.

### 3.2 Tables that gain `regionId`

| Model                   | Reason                                                          |
| ----------------------- | --------------------------------------------------------------- |
| `User`                  | Admin assignment (one region per ADMIN)                         |
| `Customer` (B2B)        | Each branch has its own corporate customers                    |
| `B2CCustomer`           | Each branch has its own retail customers                       |
| `Cylinder`              | Physical assets live at a specific branch                       |
| `Expense`               | Operational expenses per branch                                 |
| `OfficeExpense`         | Rent / daily expenses are per branch                            |
| `SalaryRecord`          | Each branch pays its own staff                                  |
| `DailyPlantPrice`       | Plant pricing can vary per branch                               |
| `Product`               | Inventory per branch                                            |
| `CustomItem`            | Accessory inventory per branch                                  |
| `Store`                 | A store belongs to a branch                                     |
| `Vehicle`               | A vehicle is assigned to a branch                               |
| `PurchaseEntry`         | Purchase records per branch                                     |
| `VendorPayment`         | Each branch pays vendors separately                             |
| `VendorOrder`           | Each branch places its own orders                               |
| `VendorInventory`       | Each branch tracks its own supplier-side inventory              |
| `VendorFinancialReport` | Per-branch financial snapshots                                  |
| `B2BTransaction`        | Denormalised for fast filtering (already implied via FK)        |
| `B2CTransaction`        | Denormalised for fast filtering (already implied via FK)        |

> **Out of scope (intentionally global):** `Vendor` (shared supplier directory), `VendorBankDetails`, `VendorCategoryConfig`, `MarginCategory`, `SystemSettings`, `Notification`, `ActivityLog`, `BillSequence`, all transaction-line-item tables (they inherit from their parent transaction).
>
> **Why vendors are global:** the same supplier (e.g. "Total Parco") is often shared across branches; only each branch's *activity* against that vendor (orders, payments, purchases, inventory, reports) is region-scoped.

### 3.3 Field signature added to each table

```prisma
  regionId   String?
  region     Region?  @relation(fields: [regionId], references: [id])

  @@index([regionId])
```

We keep it **nullable initially** so the migration is non-destructive; the application layer treats `null` as "legacy / unassigned" and the back-fill script (§4.2) populates them.

### 3.4 `OfficeExpense` unique constraint update

The current constraint `@@unique([type, month, year])` enforces "one rent per month globally". That has to become **per region**:

```prisma
@@unique([regionId, type, month, year])
```

### 3.5 `SalaryRecord` unique constraint update

Currently `@@unique([userId, month, year])`. A user can in principle work across regions in the future, so keep as-is for now but add `regionId` field. (Discussed; revisit later if needed.)

---

## 4. Migration Strategy (Zero-Downtime in Dev / Safe in Prod)

### 4.1 Prisma migration

1. Update `prisma/schema.prisma` with the new `Region` model + `regionId` columns.
2. Run:
   ```powershell
   npx prisma migrate dev --name add_regions
   ```
3. Prisma generates SQL that:
   - Creates `regions` table.
   - Adds nullable `regionId` columns + indexes on each scoped table.
   - Updates the `office_expenses` unique constraint.

### 4.2 Data back-fill script — `scripts/backfill-regions.js`

Idempotent Node script that:

1. **Upserts** the default region:
   ```js
   { name: "Hayatabad Branch", code: "HYT", isDefault: true, isActive: true }
   ```
2. For every region-scoped table, runs:
   ```sql
   UPDATE <table> SET region_id = '<hayatabad-id>' WHERE region_id IS NULL;
   ```
3. Logs counts per table (so the user has visibility).

The user runs:
```powershell
node scripts/backfill-regions.js
```

### 4.3 Optional hardening (Phase 2, after backfill verified)

A second migration can later mark `regionId` as **NOT NULL** and add a default. We leave it nullable for now to avoid hard failures during the rollout.

---

## 5. Region Selection — Persistence & Transport

### 5.1 Persistence layer

- HttpOnly cookie: **`flamora_region_id`** (sameSite=Lax, path=`/`, secure in prod, 30-day TTL).
- Set/cleared via the API route `POST /api/admin/regions/select`.
- The select endpoint enforces role-based access:
  - `SUPER_ADMIN` may set the cookie to **any active region**.
  - `ADMIN` may only set the cookie to **their assigned `User.regionId`**. Any other id → 403.
- Optionally mirrored into NextAuth JWT later (out of scope for v1).

### 5.2 Transport into API routes

Update `src/proxy.ts` to:

1. Read `flamora_region_id` cookie on every request.
2. **Page routes:** if user is authenticated AND has no region cookie AND is not already on `/select-region` AND is not on a public route → redirect to `/select-region?callbackUrl=<original>`.
3. **API routes:** inject `x-region-id: <id>` header into the forwarded request.
4. Routes that should be **excluded** from the region-required check:
   - `/select-region`
   - `/api/admin/regions` (list/CRUD — needed before selection)
   - `/api/admin/regions/select`
   - `/api/auth/*`
   - `/api/notifications/*` (notifications are global)
   - All `public` paths.

### 5.3 Role-based UX on `/select-region`

| Role          | Behaviour                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `SUPER_ADMIN` | Sees grid of **all active regions**. Can pick any. Has a **"Manage regions"** action.              |
| `ADMIN`       | Sees only **their assigned region** (auto-selected with one click). If `regionId` is null → "Access not assigned — contact your super admin" screen with sign-out. |

### 5.4 Server helper — `src/lib/region.ts`

```ts
export function getRegionIdFromRequest(req: NextRequest | Request): string | null { /* reads x-region-id header */ }

export async function requireRegionId(req: NextRequest | Request): Promise<string> { /* throws 400 if missing */ }

export function regionScopedWhere<T extends object>(req: NextRequest, where: T = {} as T): T & { regionId: string } { /* spreads regionId in */ }

export async function getActiveRegions() { /* prisma.region.findMany */ }
```

Used by every region-scoped endpoint. Keeps things DRY.

---

## 6. UI Changes

### 6.1 Post-login Select-Region page — `src/app/select-region/page.tsx`

A standalone (non-dashboard-wrapped) full-screen page consistent with the login screen aesthetic:

- Logo + heading: **"Select your branch"**.
- Sub-heading explains why we're asking.
- Card grid of active regions (icon + name + address + "Select" button).
- For `SUPER_ADMIN`: **"Manage regions"** link in the header (opens the CRUD page).
- On select → POST to `/api/admin/regions/select` → redirect to `callbackUrl` (default `/dashboard`).
- "Sign out" button as escape hatch.

Visual style: same gradient background, same `Card` / `Button` / `Badge` primitives already used by the rest of the app (login, team management, dashboard).

### 6.2 Region indicator + switcher in `DashboardLayout`

In the existing sidebar **between the logo and the navigation**:

- A compact pill showing the active region name.
- For `SUPER_ADMIN`: clicking opens a dropdown listing all active regions, plus a final entry **"Manage regions"** that links to `/admin/regions`.
- For `ADMIN`: the pill is **read-only** (no dropdown) — it just shows the assigned region. Hover tooltip: *"Your branch — contact super admin to change."*

Switching (SUPER_ADMIN only):
- Calls `/api/admin/regions/select` with the new id.
- `router.refresh()` so server components re-fetch.

### 6.3 Regions CRUD page (SUPER_ADMIN) — `src/app/(dashboard)/admin/regions/page.tsx`

Mirrors the existing **Team Management** page for consistency:

- Page heading + "Add Region" button (opens a Dialog).
- Search input.
- Table: Name, Code, Phone, Address, Default, Status, Actions (Edit, Delete).
- "Edit" opens the same dialog pre-populated.
- "Delete" → confirmation dialog. Server prevents deleting:
  - The currently-default region.
  - Any region with non-zero records (returns a friendly error listing counts).

Add this navigation entry to `superAdminNavigation` in `DashboardLayout`:
```ts
{ name: 'Regions', href: '/admin/regions', icon: BuildingOffice2Icon, roles: ['SUPER_ADMIN'] }
```

### 6.4 ADMIN behaviour

`ADMIN` users will **never** see the regions CRUD page. Their flow is:
- Login → `/select-region` → if a region is assigned: one-click confirm → `/dashboard`. If no region is assigned: "Access not assigned" screen.
- Sidebar pill is read-only (shows assigned region only).
- They cannot reach `/admin/regions` (proxy + page-level role check).
- They cannot POST to `/api/admin/regions/select` with a region id different from their own (server returns 403).

### 6.5 Team Management — region assignment for admins

The existing `src/app/(dashboard)/admin/team/page.tsx` is extended:

- **Add Admin dialog** gains a required **"Assigned Region"** dropdown.
- Each admin row shows their region (or a yellow "Unassigned" badge).
- Each row has an **"Assign / Reassign region"** action (opens a small dialog).
- Each row has a **"Revoke access"** action (sets `User.regionId = null` and `isActive = false`). Server confirms; clears their `flamora_region_id` cookie if they're online (best-effort by setting `lastActiveAt = null`; cookie clears on next request because the proxy will reject their region).

API additions:
- `PATCH /api/admin/team/[id]` — accepts `{ regionId, isActive }`.

---

## 7. API Endpoints

### 7.1 New endpoints

| Method | Path                              | Roles         | Purpose                                                                         |
| ------ | --------------------------------- | ------------- | ------------------------------------------------------------------------------- |
| GET    | `/api/admin/regions`              | ADMIN, SUPER  | List active regions. ADMIN sees only their assigned region.                     |
| POST   | `/api/admin/regions`              | SUPER         | Create region                                                                    |
| GET    | `/api/admin/regions/[id]`         | ADMIN, SUPER  | Get one region (ADMIN: only their assigned)                                     |
| PATCH  | `/api/admin/regions/[id]`         | SUPER         | Update region                                                                    |
| DELETE | `/api/admin/regions/[id]`         | SUPER         | Delete (guarded — see §6.3)                                                      |
| POST   | `/api/admin/regions/select`       | ADMIN, SUPER  | Set the cookie. ADMIN: must equal `User.regionId`, otherwise 403.               |
| GET    | `/api/admin/regions/current`      | ADMIN, SUPER  | Read currently-selected region                                                   |
| PATCH  | `/api/admin/team/[id]`            | SUPER         | Assign / re-assign / revoke an admin's region (`{ regionId, isActive }`)        |

### 7.2 Updated endpoints (region-scoped)

These get a `regionId` filter on `GET` and an injected `regionId` on `POST/PUT/PATCH`:

- `/api/customers` (B2B legacy)
- `/api/customers/b2b`
- `/api/customers/b2c`
- `/api/customers/combined`
- `/api/customers/b2b/[id]/*` (transactions, ledger, etc.)
- `/api/customers/b2c/[id]/*`
- `/api/customers/b2c/transactions`
- `/api/cylinders`
- `/api/inventory/*` (stats, cylinders, custom-items, accessories, stores, vehicles, customer-cylinders, empty-cylinders)
- `/api/expenses`
- `/api/financial/expenses`
- `/api/financial/revenue`
- `/api/financial/profit`
- `/api/financial/salaries`
- `/api/financial/summary`
- `/api/dashboard/stats`
- `/api/vendors` (and sub-routes)
- `/api/b2b-transactions`
- `/api/admin/plant-prices`
- `/api/pricing`
- `/api/reports/*`
- `/api/reconciliation/*`

Pattern (illustrative):

```ts
// BEFORE
const customers = await prisma.customer.findMany({ where });

// AFTER
import { regionScopedWhere } from '@/lib/region';
const customers = await prisma.customer.findMany({
  where: regionScopedWhere(request, where),
});
```

For writes:

```ts
const regionId = await requireRegionId(request);
await prisma.customer.create({ data: { ...inputs, regionId } });
```

---

## 8. Data Integrity Considerations

1. **Transactions inherit region from customer.** When creating a B2B/B2C transaction, the API verifies the customer's `regionId === activeRegionId` and copies it onto the transaction. This blocks cross-region accidents.
2. **Cylinder rentals** are not directly region-scoped; the cylinder itself carries `regionId`, so we filter rentals via `cylinder.regionId`.
3. **Notifications & Activity logs** remain global — we display *all* activity to a `SUPER_ADMIN`. Their `metadata.regionId` is set when relevant, so per-region drill-downs are possible later.
4. **Bill sequences** (`Customer.billSequence`, `B2CCustomer.billSequence`) live on the customer row and so are naturally region-scoped without any change.
5. **Soft delete behaviour** for region: a deleted region with linked rows is rejected; otherwise a hard delete is performed.

---

## 9. Files to Create

```
docs/
  REGION_IMPLEMENTATION_PLAN.md                      ← this file
  REGION_TASKS.md                                    ← task tracker

prisma/
  schema.prisma                                      ← updated

scripts/
  backfill-regions.js                                ← new

src/
  lib/region.ts                                      ← new helper
  proxy.ts                                           ← updated
  app/select-region/
    layout.tsx                                       ← new (no dashboard chrome)
    page.tsx                                         ← new
  app/(dashboard)/admin/regions/
    page.tsx                                         ← new (SUPER_ADMIN CRUD)
  app/api/admin/regions/route.ts                     ← new (GET, POST)
  app/api/admin/regions/[id]/route.ts                ← new (GET, PATCH, DELETE)
  app/api/admin/regions/select/route.ts              ← new (POST + DELETE)
  app/api/admin/regions/current/route.ts             ← new (GET)
  components/layouts/DashboardLayout.tsx             ← updated (region pill + switcher)
  components/region/RegionSwitcher.tsx               ← new (small client component)
```

## 10. Files Modified (region-scope wiring)

API routes — update each to use `regionScopedWhere` / `requireRegionId`:

- `src/app/api/customers/route.ts`
- `src/app/api/customers/b2b/route.ts` (+ children)
- `src/app/api/customers/b2c/route.ts` (+ children)
- `src/app/api/customers/combined/route.ts`
- `src/app/api/cylinders/route.ts`
- `src/app/api/inventory/**/route.ts`
- `src/app/api/expenses/route.ts`
- `src/app/api/financial/**/route.ts`
- `src/app/api/dashboard/stats/route.ts`
- `src/app/api/vendors/route.ts` (+ children)
- `src/app/api/b2b-transactions/route.ts`
- `src/app/api/admin/plant-prices/route.ts`
- `src/app/api/pricing/route.ts`
- `src/app/api/reports/**/route.ts`
- `src/app/api/reconciliation/**/route.ts`

> Rough count: ~25–30 route files. We will batch-update them following the same pattern.

---

## 11. Rollout Order

1. **Phase 1 — Schema & data**  
   Schema → `prisma migrate dev` → backfill script → manual sanity check (`SELECT count(*) WHERE region_id IS NULL` should be `0`).

2. **Phase 2 — Region domain**  
   `lib/region.ts`, `/api/admin/regions/*`, `/select-region`, `/admin/regions`, sidebar switcher, `proxy.ts`.

3. **Phase 3 — Plumb existing endpoints**  
   Wire `regionScopedWhere` into all GETs and `regionId` into all writes, batch by domain (customers → inventory → financial → vendors → reports). Smoke-test each domain after wiring.

4. **Phase 4 — Polish**  
   - Empty-state messaging when a brand-new region has no data.
   - Region-aware CSV export filenames.
   - Activity log: include region name in human-readable details.

---

## 12. Backwards Compatibility & Risks

| Risk | Mitigation |
| ---- | ---------- |
| Stale browser sessions without region cookie | `proxy.ts` redirect handles this gracefully |
| Forgetting `regionId` on a new write path | Centralised helper + lint-style code review checklist |
| Cross-region customer reuse (e.g. same B2B customer in two branches) | Out of scope for v1; treated as two separate records |
| User toggles regions while a form is open | `router.refresh()` after switch + soft warning if there are unsaved changes |
| Accidentally deleting a region with data | Server-side delete guard returning 409 with counts |

---

## 13. Acceptance Criteria

- ✅ Logging in with no `flamora_region_id` cookie redirects to `/select-region`.
- ✅ Existing data appears under "Hayatabad Branch" by default.
- ✅ Switching regions instantly changes data shown in dashboard, customers, inventory, financial, vendors, reports.
- ✅ A `SUPER_ADMIN` can add a brand-new region and it shows up empty.
- ✅ A `SUPER_ADMIN` cannot delete a region with linked data; cannot delete the default region.
- ✅ An `ADMIN` cannot access `/admin/regions` (403 + UI hides the link).
- ✅ Creating a customer / cylinder / expense in Region A and switching to Region B hides those records.
- ✅ The UI in `/select-region`, `/admin/regions`, and the sidebar pill matches the rest of the app (Cards, Buttons, Badges, gradient background, blue/indigo accent).

---

## 14. Out of Scope (v1)

- Per-region pricing rules (uses global `MarginCategory` for now).
- Cross-region transfers (e.g. moving cylinders from Hayatabad → Islamabad branch).
- Per-region admins (admins can switch to any region).
- Region-specific PDF letterheads.

These can be addressed in a v2 iteration once the core scoping is solid.
