# B2C Profit Margin Implementation Plan

## 🎯 Problem Identified

### ❌ Current Implementation (WRONG):
```javascript
Profit = Gas Selling Price + Accessory Selling Price
```

**This calculates REVENUE, not PROFIT!**

### ✅ Correct Implementation (NEEDED):
```javascript
Profit = (Gas Selling Price - Gas Cost Price) 
       + (Accessory Selling Price - Accessory Cost Price)
       + Security Deduction (25% on returns)
       + (Delivery Charged - Delivery Cost)
```

---

## 📊 User's Correct Requirements

| Profit Source | Description | Example |
|---------------|-------------|---------|
| **Gas Margin** | Difference between buy and sell price | Buy Rs 3,000, Sell Rs 3,600 → **Rs 600 profit** |
| **Accessory Margin** | Profit from accessories | Buy Rs 900, Sell Rs 1,200 → **Rs 300 profit** |
| **Security Deduction** | 25% kept on cylinder return | Security Rs 30,000 → Keep Rs 7,500 → **Rs 7,500 profit** |
| **Delivery Charges** | Delivery charged - actual cost | Charge Rs 500, Cost Rs 300 → **Rs 200 profit** |

---

## 🔍 Current Schema Analysis

### ❌ What's Missing:

#### 1. **B2CTransactionGasItem** (Gas Sales):
```prisma
model B2CTransactionGasItem {
  id            String
  transactionId String
  cylinderType  CylinderType
  quantity      Int
  pricePerItem  Decimal    // ✅ Selling price (exists)
  totalPrice    Decimal    // ✅ Total selling price (exists)
  // ❌ MISSING: costPrice field
  // ❌ MISSING: totalCost field
  // ❌ MISSING: profitMargin field
}
```

#### 2. **B2CTransactionAccessoryItem** (Accessories):
```prisma
model B2CTransactionAccessoryItem {
  id            String
  transactionId String
  itemName      String
  quantity      Int
  pricePerItem  Decimal    // ✅ Selling price (exists)
  totalPrice    Decimal    // ✅ Total selling price (exists)
  // ❌ MISSING: costPrice field
  // ❌ MISSING: totalCost field
  // ❌ MISSING: profitMargin field
}
```

#### 3. **B2CTransaction** (Main Transaction):
```prisma
model B2CTransaction {
  id              String
  billSno         String
  customerId      String
  date            DateTime
  time            DateTime
  totalAmount     Decimal        // ✅ Total selling price (exists)
  deliveryCharges Decimal        // ✅ Delivery charged (exists)
  finalAmount     Decimal        // ✅ Final amount (exists)
  // ❌ MISSING: totalCost field
  // ❌ MISSING: actualProfit field
  // ❌ MISSING: deliveryCost field
}
```

#### 4. **B2CCustomer** (Customer Summary):
```prisma
model B2CCustomer {
  id          String
  name        String
  totalProfit Decimal    // ❌ Currently stores REVENUE, not profit!
  // Should track actual profit margin
}
```

---

## ✅ Solution: Schema Updates Needed

### 1. Update `B2CTransactionGasItem`:
```prisma
model B2CTransactionGasItem {
  id            String        @id @default(cuid())
  transactionId String
  cylinderType  CylinderType
  quantity      Int           @default(1)
  
  // Selling prices (existing)
  pricePerItem  Decimal       @db.Decimal(10, 2)  // ✅ Keep
  totalPrice    Decimal       @db.Decimal(15, 2)  // ✅ Keep
  
  // Cost prices (NEW)
  costPrice     Decimal       @default(0) @db.Decimal(10, 2)  // ➕ ADD
  totalCost     Decimal       @default(0) @db.Decimal(15, 2)  // ➕ ADD
  profitMargin  Decimal       @default(0) @db.Decimal(15, 2)  // ➕ ADD
  
  transaction   B2CTransaction @relation(fields: [transactionId], references: [id])

  @@map("b2c_transaction_gas_items")
}
```

### 2. Update `B2CTransactionAccessoryItem`:
```prisma
model B2CTransactionAccessoryItem {
  id            String        @id @default(cuid())
  transactionId String
  itemName      String
  quantity      Int           @default(1)
  
  // Selling prices (existing)
  pricePerItem  Decimal       @db.Decimal(10, 2)  // ✅ Keep
  totalPrice    Decimal       @db.Decimal(15, 2)  // ✅ Keep
  
  // Cost prices (NEW)
  costPrice     Decimal       @default(0) @db.Decimal(10, 2)  // ➕ ADD
  totalCost     Decimal       @default(0) @db.Decimal(15, 2)  // ➕ ADD
  profitMargin  Decimal       @default(0) @db.Decimal(15, 2)  // ➕ ADD
  
  transaction   B2CTransaction @relation(fields: [transactionId], references: [id])

  @@map("b2c_transaction_accessory_items")
}
```

### 3. Update `B2CTransaction`:
```prisma
model B2CTransaction {
  id              String                @id @default(cuid())
  billSno         String                @unique
  customerId      String
  date            DateTime
  time            DateTime
  
  // Revenue (existing)
  totalAmount     Decimal               @db.Decimal(15, 2)  // ✅ Keep
  deliveryCharges Decimal               @default(0) @db.Decimal(10, 2)  // ✅ Keep
  finalAmount     Decimal               @db.Decimal(15, 2)  // ✅ Keep
  
  // Cost & Profit (NEW)
  totalCost       Decimal               @default(0) @db.Decimal(15, 2)  // ➕ ADD
  deliveryCost    Decimal               @default(0) @db.Decimal(10, 2)  // ➕ ADD
  actualProfit    Decimal               @default(0) @db.Decimal(15, 2)  // ➕ ADD
  
  paymentMethod   String                @default("CASH")
  notes           String?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
  customer        B2CCustomer           @relation(fields: [customerId], references: [id])
  gasItems        B2CTransactionGasItem[]
  securityItems   B2CTransactionSecurityItem[]
  accessoryItems  B2CTransactionAccessoryItem[]

  @@map("b2c_transactions")
}
```

### 4. Update `B2CCustomer`:
```prisma
model B2CCustomer {
  id                String            @id @default(cuid())
  name              String
  phone             String
  email             String?
  address           String
  houseNumber       String?
  sector            String?
  street            String?
  phase             String?
  area              String?
  city              String            @default("Hayatabad")
  googleMapLocation String?
  
  // Financial tracking
  totalRevenue      Decimal           @default(0) @db.Decimal(15, 2)  // ➕ ADD (optional)
  totalProfit       Decimal           @default(0) @db.Decimal(15, 2)  // ✅ Keep (fix calculation)
  
  isActive          Boolean           @default(true)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  transactions      B2CTransaction[]
  cylinderHoldings  B2CCylinderHolding[]

  @@map("b2c_customers")
}
```

---

## 🔧 Implementation Steps

### Phase 1: Database Schema Migration

#### Step 1.1: Create Migration File
```bash
npx prisma migrate dev --name add_b2c_profit_margin_tracking
```

#### Step 1.2: Migration will add:
- `costPrice`, `totalCost`, `profitMargin` to `B2CTransactionGasItem`
- `costPrice`, `totalCost`, `profitMargin` to `B2CTransactionAccessoryItem`
- `totalCost`, `deliveryCost`, `actualProfit` to `B2CTransaction`

---

### Phase 2: API Updates

#### File: `src/app/api/customers/b2c/transactions/route.ts`

**Current (Lines 72-76):**
```javascript
// Calculate totals
const gasTotal = gasItems.reduce((sum: number, item: any) => 
  sum + (item.pricePerItem * item.quantity), 0);
const accessoryTotal = accessoryItems.reduce((sum: number, item: any) => 
  sum + (item.pricePerItem * item.quantity), 0);
```

**Updated:**
```javascript
// Calculate revenue totals
const gasTotal = gasItems.reduce((sum: number, item: any) => 
  sum + (item.pricePerItem * item.quantity), 0);
const accessoryTotal = accessoryItems.reduce((sum: number, item: any) => 
  sum + (item.pricePerItem * item.quantity), 0);

// Calculate cost totals
const gasCost = gasItems.reduce((sum: number, item: any) => 
  sum + ((item.costPrice || 0) * item.quantity), 0);
const accessoryCost = accessoryItems.reduce((sum: number, item: any) => 
  sum + ((item.costPrice || 0) * item.quantity), 0);

// Calculate profit margins
const gasProfit = gasTotal - gasCost;
const accessoryProfit = accessoryTotal - accessoryCost;
const deliveryProfit = Number(deliveryCharges) - (Number(deliveryCost) || 0);

const totalCost = gasCost + accessoryCost + (Number(deliveryCost) || 0);
const actualProfit = gasProfit + accessoryProfit + deliveryProfit;
```

**Current (Lines 95-106):**
```javascript
// Create gas items
if (gasItems.length > 0) {
  await tx.b2CTransactionGasItem.createMany({
    data: gasItems.map((item: any) => ({
      transactionId: newTransaction.id,
      cylinderType: item.cylinderType,
      quantity: item.quantity,
      pricePerItem: item.pricePerItem,
      totalPrice: item.pricePerItem * item.quantity
    }))
  });
}
```

**Updated:**
```javascript
// Create gas items with cost and profit tracking
if (gasItems.length > 0) {
  await tx.b2CTransactionGasItem.createMany({
    data: gasItems.map((item: any) => {
      const totalPrice = item.pricePerItem * item.quantity;
      const costPrice = item.costPrice || 0;
      const totalCost = costPrice * item.quantity;
      const profitMargin = totalPrice - totalCost;
      
      return {
        transactionId: newTransaction.id,
        cylinderType: item.cylinderType,
        quantity: item.quantity,
        pricePerItem: item.pricePerItem,
        totalPrice,
        costPrice,
        totalCost,
        profitMargin
      };
    })
  });
}
```

**Current (Lines 169-179):**
```javascript
// Create accessory items
if (accessoryItems.length > 0) {
  await tx.b2CTransactionAccessoryItem.createMany({
    data: accessoryItems.map((item: any) => ({
      transactionId: newTransaction.id,
      itemName: item.itemName,
      quantity: item.quantity,
      pricePerItem: item.pricePerItem,
      totalPrice: item.pricePerItem * item.quantity
    }))
  });
}
```

**Updated:**
```javascript
// Create accessory items with cost and profit tracking
if (accessoryItems.length > 0) {
  await tx.b2CTransactionAccessoryItem.createMany({
    data: accessoryItems.map((item: any) => {
      const totalPrice = item.pricePerItem * item.quantity;
      const costPrice = item.costPrice || 0;
      const totalCost = costPrice * item.quantity;
      const profitMargin = totalPrice - totalCost;
      
      return {
        transactionId: newTransaction.id,
        itemName: item.itemName,
        quantity: item.quantity,
        pricePerItem: item.pricePerItem,
        totalPrice,
        costPrice,
        totalCost,
        profitMargin
      };
    })
  });
}
```

**Current (Lines 181-191):**
```javascript
// Update customer's total profit
// Only count gas and accessory sales as profit, NOT security deposits (they're refundable)
const profitAmount = gasTotal + accessoryTotal;
await tx.b2CCustomer.update({
  where: { id: customerId },
  data: {
    totalProfit: {
      increment: profitAmount // Exclude security deposits from profit
    }
  }
});
```

**Updated:**
```javascript
// Update customer's actual profit margin
// Profit = (Selling Price - Cost Price) + Security Deductions
const profitAmount = actualProfit; // Actual margin, not revenue
await tx.b2CCustomer.update({
  where: { id: customerId },
  data: {
    totalProfit: {
      increment: profitAmount // Actual profit margin
    }
  }
});
```

---

### Phase 3: Frontend Updates

#### File: `src/app/(dashboard)/customers/b2c/[id]/transaction/page.tsx`

**Add cost price fields to state:**
```typescript
interface GasItem {
  cylinderType: string;
  quantity: number;
  pricePerItem: number;  // Selling price
  costPrice: number;      // ➕ ADD: Cost price
}

interface AccessoryItem {
  itemName: string;
  quantity: number;
  pricePerItem: number;  // Selling price
  costPrice: number;      // ➕ ADD: Cost price
}
```

**Add delivery cost field:**
```typescript
const [deliveryCharges, setDeliveryCharges] = useState(0);
const [deliveryCost, setDeliveryCost] = useState(0);  // ➕ ADD
```

**Update UI to show cost price inputs:**
```tsx
{/* Gas Items */}
<div className="grid grid-cols-5 gap-4">
  <div>
    <Label>Cylinder Type</Label>
    <Select ...>
  </div>
  <div>
    <Label>Quantity</Label>
    <Input type="number" ...>
  </div>
  <div>
    <Label>Selling Price</Label>  {/* ✅ Rename */}
    <Input type="number" ...>
  </div>
  <div>
    <Label>Cost Price</Label>  {/* ➕ ADD */}
    <Input 
      type="number"
      value={item.costPrice}
      onChange={(e) => updateGasItem(index, 'costPrice', parseFloat(e.target.value))}
    />
  </div>
  <div>
    <Label>Profit Margin</Label>  {/* ➕ ADD (calculated) */}
    <Input 
      type="number"
      value={(item.pricePerItem - item.costPrice) * item.quantity}
      disabled
      className="bg-green-50"
    />
  </div>
</div>
```

**Update totals display:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Transaction Summary</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      {/* Revenue */}
      <div className="flex justify-between">
        <span>Gas Revenue:</span>
        <span>Rs {gasTotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Accessory Revenue:</span>
        <span>Rs {accessoryTotal.toFixed(2)}</span>
      </div>
      
      {/* Cost */}
      <div className="flex justify-between text-red-600">
        <span>Gas Cost:</span>
        <span>-Rs {gasCost.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-red-600">
        <span>Accessory Cost:</span>
        <span>-Rs {accessoryCost.toFixed(2)}</span>
      </div>
      
      <Separator />
      
      {/* Profit */}
      <div className="flex justify-between font-bold text-green-600">
        <span>Gross Profit:</span>
        <span>Rs {(gasTotal + accessoryTotal - gasCost - accessoryCost).toFixed(2)}</span>
      </div>
      
      {/* Delivery */}
      <div className="flex justify-between">
        <span>Delivery Charged:</span>
        <span>Rs {deliveryCharges.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-red-600">
        <span>Delivery Cost:</span>
        <span>-Rs {deliveryCost.toFixed(2)}</span>
      </div>
      
      <Separator />
      
      {/* Final */}
      <div className="flex justify-between text-xl font-bold text-green-700">
        <span>Net Profit:</span>
        <span>Rs {actualProfit.toFixed(2)}</span>
      </div>
      
      <div className="flex justify-between text-lg font-semibold">
        <span>Amount to Collect:</span>
        <span>Rs {finalAmount.toFixed(2)}</span>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### Phase 4: Data Migration Script

#### File: `scripts/migrate-b2c-profit-to-margin.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateB2CProfitToMargin() {
  console.log('🔄 Starting B2C Profit Margin Migration...\n');

  try {
    // Get all B2C transactions
    const transactions = await prisma.b2CTransaction.findMany({
      include: {
        gasItems: true,
        accessoryItems: true,
        securityItems: true,
        customer: true
      }
    });

    console.log(`📊 Found ${transactions.length} B2C transactions\n`);

    let updatedCount = 0;
    const errors = [];

    for (const txn of transactions) {
      try {
        console.log(`Processing transaction: ${txn.billSno}`);

        // For existing data without cost prices, we need to either:
        // Option 1: Set cost to 0 (profit = revenue) - conservative
        // Option 2: Estimate cost as percentage of selling price (e.g., 70%)
        // Option 3: Manually update later
        
        // We'll use Option 1 for safety
        const gasCost = 0;
        const accessoryCost = 0;
        const deliveryCost = 0;
        
        const gasRevenue = txn.gasItems.reduce((sum, item) => 
          sum + Number(item.totalPrice), 0);
        const accessoryRevenue = txn.accessoryItems.reduce((sum, item) => 
          sum + Number(item.totalPrice), 0);
        
        const actualProfit = gasRevenue + accessoryRevenue; // No cost data available
        
        // Update transaction
        await prisma.b2CTransaction.update({
          where: { id: txn.id },
          data: {
            totalCost: gasCost + accessoryCost,
            deliveryCost: deliveryCost,
            actualProfit: actualProfit
          }
        });

        // Update gas items
        for (const item of txn.gasItems) {
          await prisma.b2CTransactionGasItem.update({
            where: { id: item.id },
            data: {
              costPrice: 0,
              totalCost: 0,
              profitMargin: Number(item.totalPrice)
            }
          });
        }

        // Update accessory items
        for (const item of txn.accessoryItems) {
          await prisma.b2CTransactionAccessoryItem.update({
            where: { id: item.id },
            data: {
              costPrice: 0,
              totalCost: 0,
              profitMargin: Number(item.totalPrice)
            }
          });
        }

        updatedCount++;
        console.log(`✅ Updated ${txn.billSno}`);
      } catch (err) {
        errors.push({ txn: txn.billSno, error: err.message });
        console.error(`❌ Error updating ${txn.billSno}:`, err.message);
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total Transactions: ${transactions.length}`);
    console.log(`Successfully Updated: ${updatedCount}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(e => console.log(`  - ${e.txn}: ${e.error}`));
    }

    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('1. Existing transactions have cost = 0 (profit = revenue)');
    console.log('2. You need to manually update cost prices for accurate profit');
    console.log('3. All NEW transactions will track cost prices properly\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateB2CProfitToMargin()
  .then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
```

---

## 📊 Profit Calculation Examples

### Example 1: Complete Transaction

```javascript
Transaction Data:
├─ Gas Items:
│  ├─ 1x Domestic Gas @ Rs 3,600 (cost: Rs 3,000)
│  └─ Profit: Rs 600
├─ Accessories:
│  ├─ 1x Regulator @ Rs 1,200 (cost: Rs 900)
│  └─ Profit: Rs 300
├─ Delivery:
│  ├─ Charged: Rs 500
│  ├─ Cost: Rs 300
│  └─ Profit: Rs 200
└─ Security: Rs 30,000 (liability, not profit)

Calculations:
├─ Total Revenue: Rs 3,600 + Rs 1,200 + Rs 30,000 = Rs 34,800
├─ Total Cost: Rs 3,000 + Rs 900 = Rs 3,900
├─ Actual Profit: Rs 600 + Rs 300 + Rs 200 = Rs 1,100 ✅
└─ Customer Pays: Rs 35,300 (including delivery Rs 500)
```

### Example 2: Cylinder Return

```javascript
When customer returns cylinder:
├─ Security Refund: Rs 22,500 (75% of Rs 30,000)
├─ Security Kept: Rs 7,500 (25% deduction)
└─ Profit from Return: Rs 7,500 ✅

Total Profit Lifecycle:
├─ Initial Sale: Rs 1,100
├─ Return Deduction: Rs 7,500
└─ Total: Rs 8,600 ✅
```

---

## 🎯 Summary

### Changes Required:
1. ✅ Database schema (3 models updated)
2. ✅ Transaction API (profit calculation logic)
3. ✅ Transaction form UI (cost price inputs)
4. ✅ Migration script (existing data)

### Benefits:
1. ✅ Accurate profit margin tracking
2. ✅ Cost price visibility
3. ✅ Better business insights
4. ✅ Proper profitability analysis

### Timeline:
- Schema migration: 15 minutes
- API updates: 30 minutes
- Frontend updates: 45 minutes
- Testing: 30 minutes
- **Total: ~2 hours**

---

**Ready to implement?** This will give you TRUE profit tracking, not just revenue!

