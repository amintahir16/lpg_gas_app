# B2C Customer Cylinder Information Display Guide

## ✅ Feature Status: **FULLY IMPLEMENTED**

When you navigate to a specific B2C customer's detail page (`/customers/b2c/[id]`), the cylinder information is displayed in **two sections**:

---

## 📊 1. Active Cylinders Stats Card (Top Row)

**Location**: Top row of stats cards (4th card)

**Shows**:
- 📦 Icon with orange background
- Label: "Active Cylinders"
- **Count**: Total number of cylinders currently held by customer

**Example Display**:
```
📦  Active Cylinders
    1
```

---

## 📋 2. Current Cylinder Holdings Card (Detailed View)

**Location**: Below contact information, right side of the two-column layout

**Shows**:
- Title: "Current Cylinder Holdings"
- **Detailed breakdown** of each cylinder:
  - Cylinder type with color-coded badge (e.g., "Domestic (11.8kg) x1")
  - Issue date (when cylinder was given to customer)
  - Security amount per item
  
**Example Display**:
```
Current Cylinder Holdings
┌────────────────────────────────────────────┐
│  [Domestic (11.8kg) x1]                    │
│  Issued: 12/11/2024                        │
│                              Rs 30000.00   │
│                              Security      │
└────────────────────────────────────────────┘
```

**If no cylinders**:
```
Current Cylinder Holdings
┌────────────────────────────────────────────┐
│                                            │
│    No active cylinder holdings             │
│                                            │
└────────────────────────────────────────────┘
```

---

## 🔄 How It Works

### When Customer Purchases Cylinder:

1. **Create Transaction** → Go to customer page → Click "New Transaction"

2. **Add Security Item** → In the Security Items section:
   - Select cylinder type
   - Enter quantity (usually 1)
   - Enter security amount (e.g., Rs 30,000 for Domestic)
   - Keep "Is Return" unchecked (for new cylinder)

3. **Submit Transaction** → System automatically:
   - Creates `B2CCylinderHolding` record
   - Sets `isReturned = false`
   - Links to customer

4. **Dashboard Updates** → Customer detail page now shows:
   - Active cylinder count increased
   - New holding appears in "Current Cylinder Holdings"
   - Security amount updated

### When Customer Returns Cylinder:

1. **Create Return Transaction** → Add security item with:
   - Same cylinder type
   - Same quantity
   - Same security amount
   - **Check "Is Return"** ✓

2. **System Automatically**:
   - Marks holding as `isReturned = true`
   - Applies 25% deduction (default)
   - Removes from active count

3. **Dashboard Updates**:
   - Active cylinder count decreased
   - Holding removed from "Current Cylinder Holdings"
   - Security refunded (minus deduction)

---

## 📸 Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Back to B2C Customers]                   [+ New Transaction] │
│                                                          │
│  🏠 Customer Name                                       │
│  Customer Home: Address details                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ ₹        │  │ 🔥       │  │ 📦       │  │ 📋       ││
│  │ Total    │  │ Security │  │ Active   │  │ Total    ││
│  │ Profit   │  │ Held     │  │ Cylinders│  │ Trans.   ││
│  │ Rs X     │  │ Rs Y     │  │    1     │  │    4     ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐│
│  │ Contact Information  │  │ Current Cylinder Holdings││
│  │                      │  │                          ││
│  │ 📞 Phone number      │  │ [Domestic 11.8kg x1]    ││
│  │ ✉️  Email           │  │ Issued: 12/11/2024      ││
│  │ 📍 Address          │  │              Rs 30000.00││
│  │                      │  │              Security   ││
│  └──────────────────────┘  └──────────────────────────┘│
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │ Transaction History                                 ││
│  │ [List of all transactions...]                      ││
│  └────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Test Case: Amina Khan

**Customer**: Amina Khan (03901234567)

**Current Status**:
- **Active Cylinders**: 1
- **Cylinder Type**: DOMESTIC_11_8KG (Domestic 11.8kg)
- **Security Amount**: Rs 30,000
- **Issue Date**: December 11, 2024
- **Acquired Via**: Transaction B2C-20241211016

**Transaction History**:
1. ✅ Dec 11, 2024 - **Purchased 1 cylinder** (with Rs 30,000 security) + gas refill
2. ✅ Dec 17, 2024 - Gas refill only (no new cylinder)
3. ✅ Oct 6, 2025 - Gas refill only
4. ✅ Oct 6, 2025 - Gas refill only

**Result**: Dashboard correctly shows 1 active cylinder

---

## ✨ Recent Fixes Applied

### Fix 1: Accurate Cylinder Count
- **Before**: Counted holding records (would fail if quantity > 1)
- **After**: Sums total quantity across all holdings ✅

### Fix 2: Accurate Security Amount
- **Before**: Summed security amounts without quantity
- **After**: Multiplies security × quantity for correct total ✅

---

## 📝 Summary

✅ **Feature is fully implemented and working**
✅ **Shows in 2 locations** (stats card + detailed view)
✅ **Updates automatically** when cylinders purchased/returned
✅ **Recently fixed** to handle edge cases correctly

**No additional implementation needed!** The feature is complete and functional.

