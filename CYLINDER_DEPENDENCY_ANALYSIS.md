# Complete Cylinder Type Dependency Analysis

## Overview
This document identifies ALL places where cylinder types are used and ensures functionality is preserved when making them flexible.

---

## 1. Database Schema Dependencies

### Customer Model (B2B)
**Location:** `prisma/schema.prisma`
**Fields:**
- `domestic118kgDue` (Int) - tracks how many Domestic 11.8kg cylinders customer owes
- `standard15kgDue` (Int) - tracks how many Standard 15kg cylinders customer owes  
- `commercial454kgDue` (Int) - tracks how many Commercial 45.4kg cylinders customer owes

**Preservation Required:**
- ✅ Keep these fields for backward compatibility
- ✅ Need dynamic tracking mechanism for custom cylinder types
- ✅ Solution: Add JSON field for custom cylinder dues OR use separate tracking table

**Impact:** CRITICAL - affects customer due tracking

---

## 2. Transaction Processing Dependencies

### A. B2B Transactions (`src/app/api/customers/b2b/transactions/route.ts`)
**Hardcoded Dependencies:**
1. **Lines 207-217**: Switch statement updating cylinder due counts
   - `case 'DOMESTIC_11_8KG'` → updates `domestic118kgDue`
   - `case 'STANDARD_15KG'` → updates `standard15kgDue`
   - `case 'COMMERCIAL_45_4KG'` → updates `commercial454kgDue`
   
2. **Lines 222-232**: Empty return processing
   - Same hardcoded switch statements

3. **Lines 245-255**: Buyback processing
   - Same hardcoded switch statements

4. **Lines 263-272**: Return empty processing
   - Same hardcoded switch statements

5. **Lines 145-146**: Buyback calculation
   - Hardcoded capacity: `11.8`, `15`, `45.4`

**Preservation Required:**
- ✅ Must preserve cylinder due tracking functionality
- ✅ Must preserve buyback calculations
- ✅ Need dynamic capacity lookup

**Solution Approach:**
- Use `getCapacityFromTypeString()` utility for capacity
- Use `capacity` field from cylinder record instead of hardcoded values
- For custom types, store dues in separate tracking mechanism

---

### B. B2B Transactions Route (`src/app/api/b2b-transactions/route.ts`)
**Hardcoded Dependencies:**
1. **Lines 316-325**: Display name → enum mapping
   - `'Domestic'` → `'DOMESTIC_11_8KG'`
   - `'Standard'` → `'STANDARD_15KG'`
   - `'Commercial'` → `'COMMERCIAL_45_4KG'`

2. **Lines 328-329**: Capacity hardcoding
   - `11.8`, `15.0`, `45.4`

**Preservation Required:**
- ✅ Must preserve RETURN_EMPTY and BUYBACK functionality
- ✅ Must create cylinders with correct capacity

**Solution Approach:**
- Parse display name to extract typeName + capacity
- Use `generateCylinderTypeFromCapacity()` for enum
- Use extracted capacity directly

---

### C. B2C Transactions (`src/app/api/customers/b2c/transactions/route.ts`)
**Hardcoded Dependencies:**
1. **Lines 112-124**: Profit calculation - hardcoded weights
   - `DOMESTIC_11_8KG` → 11.8
   - `STANDARD_15KG` → 15.0
   - `COMMERCIAL_45_4KG` → 45.4

2. **Lines 174-186**: Profit margin calculation - same hardcoded weights

**Preservation Required:**
- ✅ Must preserve profit calculation based on margin per kg
- ✅ Formula: `marginPerKg × cylinderWeight × quantity`

**Solution Approach:**
- Use `getCapacityFromTypeString()` or fetch from database `capacity` field
- Always use actual capacity, not hardcoded values

---

## 3. Inventory Management Dependencies

### A. Inventory Integration (`src/lib/inventory-integration.ts`)
**Hardcoded Dependencies:**
1. **Lines 205-231**: Gas purchase type detection
   - Hardcoded weight mappings: 6, 11.8, 15, 30, 45.4
   - Hardcoded enum generation

2. **Lines 570-597**: Cylinder type extraction
   - Hardcoded weight → enum mappings

3. **Lines 687-703**: Capacity extraction
   - Hardcoded fallback values

**Preservation Required:**
- ✅ Must preserve vendor purchase → inventory integration
- ✅ Must correctly identify cylinder types from purchase items

**Solution Approach:**
- Extract capacity dynamically from item name
- Use `generateCylinderTypeFromCapacity()` for enum
- Use `getCylinderWeight()` utility for capacity extraction

---

### B. Cylinder Inventory API (`src/app/api/inventory/cylinders/route.ts`)
**Hardcoded Dependencies:**
1. **Lines 51-61**: Filter mapping - display name → enum
   - Hardcoded type name checks

**Preservation Required:**
- ✅ Must preserve filtering functionality
- ✅ Must work with custom type names

**Solution Approach:**
- Filter by `typeName` + `capacity` combination directly
- Remove hardcoded display name mappings

---

## 4. Pricing Dependencies

### Pricing Calculation (`src/app/api/pricing/calculate/route.ts`)
**Hardcoded Dependencies:**
1. **Line 99**: Base calculation uses 11.8kg
   - `costPerKg = plantPrice118kg / 11.8`

2. **Lines 123-125**: Price calculations
   - Hardcoded: `11.8`, `45.4`

**Preservation Required:**
- ✅ Must preserve pricing calculation logic
- ✅ Formula: `endPricePerKg × cylinderCapacity`

**Solution Approach:**
- Base calculation on 11.8kg remains (this is the standard base)
- For other types, use actual capacity: `endPricePerKg × capacity`

---

## 5. Display & UI Dependencies

### A. Frontend Forms (`src/app/(dashboard)/inventory/cylinders/page.tsx`)
**Hardcoded Dependencies:**
1. **Lines 872-881**: Add form - type name → enum mapping
   - Hardcoded checks for 'domestic', 'standard', 'commercial'

2. **Lines 449-461**: Edit form - same mappings

3. **Lines 192-245**: Display name generation
   - Hardcoded friendly names for specific types

**Preservation Required:**
- ✅ Must preserve user input flexibility
- ✅ Must display types correctly

**Solution Approach:**
- Always use `generateCylinderTypeFromCapacity()` for enum
- Use user-entered `typeName` directly
- Display using `typeName` + `capacity` format

---

### B. Customer Pages
**Hardcoded Dependencies:**
- Multiple pages have hardcoded cylinder type arrays
- Display name mappings in various components

**Preservation Required:**
- ✅ Must show all cylinder types in dropdowns
- ✅ Must display correctly

**Solution Approach:**
- Use dynamic stats from API (already implemented)
- Use `getCylinderTypeDisplayName()` utility

---

## 6. Security Deposit Dependencies

### Security Prices (`src/lib/cylinder-types.ts`)
**Hardcoded Dependencies:**
1. **Lines 50-56**: Security price mapping
   - `CYLINDER_6KG`: 20000
   - `DOMESTIC_11_8KG`: 30000
   - `STANDARD_15KG`: 50000
   - `CYLINDER_30KG`: 70000
   - `COMMERCIAL_45_4KG`: 90000

**Preservation Required:**
- ✅ Must preserve security deposit functionality
- ✅ B2C transactions depend on these prices

**Solution Approach:**
- Keep hardcoded prices for standard types (backward compatible)
- For custom types, either:
  - Use default security price
  - OR store in database configuration
  - OR calculate based on capacity

---

## 7. Reporting Dependencies

### Report Generation
**Hardcoded Dependencies:**
- Multiple report files have hardcoded display name mappings
- Export files have hardcoded column names

**Preservation Required:**
- ✅ Must preserve report generation
- ✅ Must show correct cylinder type names

**Solution Approach:**
- Use `getCylinderTypeDisplayName()` utility
- For custom types, use `typeName (capacity)kg` format

---

## 8. Statistics Dependencies

### Stats API (`src/app/api/inventory/cylinders/stats/route.ts`)
**Hardcoded Dependencies:**
1. **Lines 60-74**: Display name generation
   - Hardcoded friendly names

**Preservation Required:**
- ✅ Must preserve statistics display
- ✅ Must group by type correctly

**Solution Approach:**
- Already uses `typeName` when available
- Use `typeName (capacity)kg` format for custom types
- Remove hardcoded friendly names, use dynamic format

---

## Summary of Critical Preservation Points

1. ✅ **Customer Due Tracking** - Must preserve B2B customer cylinder due counts
2. ✅ **Transaction Processing** - Must preserve all transaction types (SALE, PAYMENT, BUYBACK, RETURN_EMPTY)
3. ✅ **Inventory Management** - Must preserve inventory deduction/addition
4. ✅ **Profit Calculations** - Must preserve B2C profit margin calculations
5. ✅ **Pricing** - Must preserve pricing calculation logic
6. ✅ **Security Deposits** - Must preserve B2C security deposit functionality
7. ✅ **Display** - Must preserve correct display of all cylinder types
8. ✅ **Statistics** - Must preserve grouping and statistics

---

## Solution Strategy

### Phase 1: Make Type Generation Dynamic (Non-Breaking)
- Remove hardcoded type name → enum mappings
- Always use `generateCylinderTypeFromCapacity()` for enum generation
- Preserve all existing functionality

### Phase 2: Make Capacity Lookup Dynamic (Non-Breaking)
- Replace hardcoded capacity values with dynamic lookups
- Use `getCapacityFromTypeString()` utility
- Or fetch from database `capacity` field

### Phase 3: Make Display Dynamic (Non-Breaking)
- Use `typeName` + `capacity` for all displays
- Remove hardcoded friendly names
- Preserve backward compatibility

### Phase 4: Make Filtering Dynamic (Non-Breaking)
- Filter by `typeName` + `capacity` directly
- Remove hardcoded display name mappings

---

## Backward Compatibility Plan

1. **Existing Cylinders** - Continue to work with existing enum values
2. **Display Names** - Use `typeName` when available, fallback to enum-based names
3. **Customer Dues** - Keep existing fields, add dynamic tracking for custom types
4. **Security Prices** - Keep existing prices for standard types, use default for custom

---

## Testing Checklist

- [ ] Add cylinder with custom type name and capacity
- [ ] B2B transaction with custom cylinder type
- [ ] B2C transaction with custom cylinder type
- [ ] Vendor purchase with custom cylinder type
- [ ] Inventory filtering with custom cylinder type
- [ ] Statistics display with custom cylinder type
- [ ] Profit calculations with custom cylinder type
- [ ] Security deposit with custom cylinder type (if applicable)
- [ ] Reports with custom cylinder types
- [ ] Customer due tracking (existing types)

