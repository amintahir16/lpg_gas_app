const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateVendorPurchases() {
  try {
    console.log('🚀 Populating Vendor Purchase Data...\n');

    // Get all vendors with their categories
    const vendors = await prisma.vendor.findMany({
      include: { category: true },
      where: { isActive: true }
    });

    console.log(`Found ${vendors.length} vendors to populate purchases for.\n`);

    // Get a user for purchases (assuming admin user exists)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.log('❌ No admin user found. Please create an admin user first.');
      return;
    }

    let totalPurchases = 0;

    // Define realistic purchase data for each category
    const purchaseData = {
      'cylinder_purchase': [
        {
          vendor: 'Khattak Plant',
          purchases: [
            {
              invoiceNumber: 'INV-CYL-001',
              items: [
                { name: 'Domestic (11.8kg) Cylinder', quantity: 50, unitPrice: 52000 },
                { name: 'Standard (15kg) Cylinder', quantity: 25, unitPrice: 105000 },
                { name: 'Commercial (45.4kg) Cylinder', quantity: 10, unitPrice: 110000 }
              ],
              paidAmount: 8000000,
              notes: 'Monthly cylinder purchase - high demand season'
            },
            {
              invoiceNumber: 'INV-CYL-002',
              items: [
                { name: 'Domestic (11.8kg) Cylinder', quantity: 30, unitPrice: 51500 },
                { name: 'Standard (15kg) Cylinder', quantity: 15, unitPrice: 102000 }
              ],
              paidAmount: 4000000,
              notes: 'Additional stock for upcoming festival'
            }
          ]
        },
        {
          vendor: 'Ali Dealer',
          purchases: [
            {
              invoiceNumber: 'INV-ALI-001',
              items: [
                { name: 'Domestic (11.8kg) Cylinder', quantity: 40, unitPrice: 51000 },
                { name: 'Standard (15kg) Cylinder', quantity: 20, unitPrice: 103000 },
                { name: 'Commercial (45.4kg) Cylinder', quantity: 8, unitPrice: 108000 }
              ],
              paidAmount: 6000000,
              notes: 'Bulk purchase with discount'
            }
          ]
        },
        {
          vendor: 'Hi-Tech',
          purchases: [
            {
              invoiceNumber: 'INV-HITECH-001',
              items: [
                { name: 'Domestic (11.8kg) Cylinder', quantity: 35, unitPrice: 52500 },
                { name: 'Standard (15kg) Cylinder', quantity: 18, unitPrice: 106000 }
              ],
              paidAmount: 4500000,
              notes: 'Premium quality cylinders'
            }
          ]
        }
      ],
      'gas_purchase': [
        {
          vendor: 'Khattak Plant',
          purchases: [
            {
              invoiceNumber: 'INV-GAS-001',
              items: [
                { name: 'Domestic (11.8kg) Gas', quantity: 100, unitPrice: 2500 },
                { name: 'Standard (15kg) Gas', quantity: 80, unitPrice: 3200 },
                { name: 'Commercial (45.4kg) Gas', quantity: 30, unitPrice: 8500 }
              ],
              paidAmount: 800000,
              notes: 'Weekly gas refill - peak season'
            }
          ]
        },
        {
          vendor: 'Afridi Plant',
          purchases: [
            {
              invoiceNumber: 'INV-AFRIDI-001',
              items: [
                { name: 'Domestic (11.8kg) Gas', quantity: 75, unitPrice: 2450 },
                { name: 'Standard (15kg) Gas', quantity: 60, unitPrice: 3150 },
                { name: 'Commercial (45.4kg) Gas', quantity: 25, unitPrice: 8400 }
              ],
              paidAmount: 600000,
              notes: 'Competitive pricing deal'
            }
          ]
        },
        {
          vendor: 'Fata Plant',
          purchases: [
            {
              invoiceNumber: 'INV-FATA-001',
              items: [
                { name: 'Domestic (11.8kg) Gas', quantity: 90, unitPrice: 2480 },
                { name: 'Standard (15kg) Gas', quantity: 70, unitPrice: 3180 },
                { name: 'Commercial (45.4kg) Gas', quantity: 20, unitPrice: 8600 }
              ],
              paidAmount: 700000,
              notes: 'Bulk gas purchase agreement'
            }
          ]
        }
      ],
      'vaporizer_purchase': [
        {
          vendor: 'Iqbal Energy',
          purchases: [
            {
              invoiceNumber: 'INV-VAP-001',
              items: [
                { name: '20kg Vaporiser', quantity: 2, unitPrice: 250000 },
                { name: '30kg Vaporiser', quantity: 1, unitPrice: 350000 },
                { name: '40kg Vaporiser', quantity: 1, unitPrice: 450000 }
              ],
              paidAmount: 1500000,
              notes: 'Industrial vaporizer setup for new facility'
            }
          ]
        },
        {
          vendor: 'Hass Vaporizer',
          purchases: [
            {
              invoiceNumber: 'INV-HASS-001',
              items: [
                { name: '20kg Vaporiser', quantity: 3, unitPrice: 245000 },
                { name: '30kg Vaporiser', quantity: 2, unitPrice: 340000 }
              ],
              paidAmount: 1415000,
              notes: 'Expansion of existing vaporizer capacity'
            }
          ]
        },
        {
          vendor: 'Fakhar Vaporizer',
          purchases: [
            {
              invoiceNumber: 'INV-FAKHAR-001',
              items: [
                { name: '30kg Vaporiser', quantity: 1, unitPrice: 360000 },
                { name: '40kg Vaporiser', quantity: 2, unitPrice: 460000 }
              ],
              paidAmount: 1280000,
              notes: 'High-capacity vaporizers for commercial use'
            }
          ]
        }
      ],
      'accessories_purchase': [
        {
          vendor: 'Daud Reeta Bazar',
          purchases: [
            {
              invoiceNumber: 'INV-ACC-001',
              items: [
                { name: 'Regulator', quantity: 50, unitPrice: 1200 },
                { name: 'Stove', quantity: 25, unitPrice: 3500 },
                { name: 'Pipe', quantity: 100, unitPrice: 150 },
                { name: 'High Pressure Regulator', quantity: 10, unitPrice: 2500 },
                { name: 'Gas Pipe (per ft)', quantity: 200, unitPrice: 80 }
              ],
              paidAmount: 250000,
              notes: 'Comprehensive accessories order for retail'
            },
            {
              invoiceNumber: 'INV-ACC-002',
              items: [
                { name: 'Regulator', quantity: 30, unitPrice: 1150 },
                { name: 'Stove', quantity: 15, unitPrice: 3400 },
                { name: 'Regulator Quality 1', quantity: 20, unitPrice: 1800 },
                { name: 'Stove Burner', quantity: 40, unitPrice: 800 }
              ],
              paidAmount: 180000,
              notes: 'Follow-up order for high-demand items'
            }
          ]
        },
        {
          vendor: 'Imtiaaz Reeta Bazar',
          purchases: [
            {
              invoiceNumber: 'INV-IMTIAZ-001',
              items: [
                { name: 'Regulator', quantity: 40, unitPrice: 1180 },
                { name: 'Stove', quantity: 20, unitPrice: 3450 },
                { name: 'Pipe', quantity: 80, unitPrice: 140 },
                { name: 'Regulator Quality 2', quantity: 15, unitPrice: 2200 },
                { name: 'Gas Jet', quantity: 50, unitPrice: 300 }
              ],
              paidAmount: 200000,
              notes: 'Premium accessories for quality-conscious customers'
            }
          ]
        },
        {
          vendor: 'Jamal Gujrawala',
          purchases: [
            {
              invoiceNumber: 'INV-JAMAL-001',
              items: [
                { name: 'Regulator', quantity: 35, unitPrice: 1200 },
                { name: 'Stove', quantity: 18, unitPrice: 3500 },
                { name: 'Pipe', quantity: 90, unitPrice: 145 },
                { name: 'Commercial Regulator', quantity: 12, unitPrice: 3000 },
                { name: 'Industrial Pipe', quantity: 60, unitPrice: 200 }
              ],
              paidAmount: 220000,
              notes: 'Mixed accessories for diverse customer base'
            }
          ]
        }
      ]
    };

    // Create purchases for each vendor
    for (const vendor of vendors) {
      const categorySlug = vendor.category?.slug;
      if (!categorySlug || !purchaseData[categorySlug]) continue;

      const vendorData = purchaseData[categorySlug].find(v => 
        v.vendor === vendor.name || v.vendor === vendor.companyName
      );

      if (!vendorData) continue;

      console.log(`📦 Creating purchases for ${vendor.name || vendor.companyName} (${vendor.category.name})...`);

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
            purchaseDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
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

    console.log(`\n🎉 Successfully created ${totalPurchases} vendor purchases!`);
    console.log('\n📊 Summary:');
    console.log('- Cylinder Purchases: Multiple purchases with various cylinder types');
    console.log('- Gas Purchases: Regular gas refills with different gas types');
    console.log('- Vaporizer Purchases: Industrial equipment purchases');
    console.log('- Accessories Purchases: Mixed accessories including custom items');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error populating vendor purchases:', error);
    await prisma.$disconnect();
  }
}

populateVendorPurchases();
