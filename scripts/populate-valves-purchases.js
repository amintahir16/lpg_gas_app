const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateValvesPurchases() {
  try {
    console.log('🚀 Populating Valves Purchase Data...\n');

    // Get Valves Purchase vendors
    const valvesVendors = await prisma.vendor.findMany({
      where: { 
        isActive: true,
        category: { slug: 'valves_purchase' }
      },
      include: { category: true }
    });

    console.log(`Found ${valvesVendors.length} Valves Purchase vendors.`);

    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.log('❌ No admin user found.');
      return;
    }

    // Define valves purchase data
    const valvesPurchaseData = [
      {
        vendor: 'Pak Gas Industries Ltd',
        purchases: [
          {
            invoiceNumber: 'INV-VALVES-001',
            items: [
              { name: 'Safety Valve 11.8kg', quantity: 50, unitPrice: 850 },
              { name: 'Safety Valve 15kg', quantity: 30, unitPrice: 950 },
              { name: 'Safety Valve 45kg', quantity: 15, unitPrice: 1200 },
              { name: 'Pressure Relief Valve', quantity: 25, unitPrice: 1500 }
            ],
            paidAmount: 200000,
            notes: 'Safety valves for cylinder inventory - bulk order'
          }
        ]
      },
      {
        vendor: 'Lahore Gas Equipment Co',
        purchases: [
          {
            invoiceNumber: 'INV-LAHORE-001',
            items: [
              { name: 'Safety Valve 11.8kg', quantity: 40, unitPrice: 820 },
              { name: 'Safety Valve 15kg', quantity: 25, unitPrice: 920 },
              { name: 'Safety Valve 45kg', quantity: 12, unitPrice: 1150 },
              { name: 'Check Valve', quantity: 20, unitPrice: 650 },
              { name: 'Ball Valve', quantity: 35, unitPrice: 450 }
            ],
            paidAmount: 180000,
            notes: 'Various valve types for equipment maintenance'
          }
        ]
      },
      {
        vendor: 'Islamabad Gas Solutions',
        purchases: [
          {
            invoiceNumber: 'INV-ISB-001',
            items: [
              { name: 'Safety Valve 11.8kg', quantity: 35, unitPrice: 830 },
              { name: 'Safety Valve 15kg', quantity: 20, unitPrice: 930 },
              { name: 'Safety Valve 45kg', quantity: 10, unitPrice: 1180 },
              { name: 'Gate Valve', quantity: 15, unitPrice: 1800 },
              { name: 'Butterfly Valve', quantity: 8, unitPrice: 2200 }
            ],
            paidAmount: 150000,
            notes: 'Premium valves for high-pressure applications'
          }
        ]
      }
    ];

    let totalPurchases = 0;

    // Create purchases for each valves vendor
    for (const vendor of valvesVendors) {
      const vendorData = valvesPurchaseData.find(v => 
        v.vendor === vendor.name || v.vendor === vendor.companyName
      );

      if (!vendorData) continue;

      console.log(`📦 Creating purchases for ${vendor.name || vendor.companyName}...`);

      for (const purchaseInfo of vendorData.purchases) {
        // Calculate total amount
        const totalAmount = purchaseInfo.items.reduce((sum, item) => 
          sum + (item.quantity * item.unitPrice), 0
        );

        // Create purchase
        const purchase = await prisma.vendorPurchase.create({
          data: {
            vendorId: vendor.id,
            userId: adminUser.id,
            purchaseDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000), // Random date within last 15 days
            invoiceNumber: purchaseInfo.invoiceNumber,
            notes: purchaseInfo.notes,
            totalAmount: totalAmount,
            paidAmount: purchaseInfo.paidAmount,
            balanceAmount: totalAmount - purchaseInfo.paidAmount,
            paymentStatus: purchaseInfo.paidAmount >= totalAmount ? 'PAID' : 
                          purchaseInfo.paidAmount > 0 ? 'PARTIAL' : 'UNPAID'
          }
        });

        // Create purchase items
        for (const itemInfo of purchaseInfo.items) {
          await prisma.vendorPurchaseItem.create({
            data: {
              purchaseId: purchase.id,
              itemName: itemInfo.name,
              quantity: itemInfo.quantity,
              unitPrice: itemInfo.unitPrice,
              totalPrice: itemInfo.quantity * itemInfo.unitPrice
            }
          });
        }

        totalPurchases++;
        console.log(`   ✅ Created purchase ${purchaseInfo.invoiceNumber} - PKR ${totalAmount.toLocaleString()}`);
      }
    }

    console.log(`\n🎉 Successfully created ${totalPurchases} valves purchase transactions!`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error populating valves purchases:', error);
    await prisma.$disconnect();
  }
}

populateValvesPurchases();
