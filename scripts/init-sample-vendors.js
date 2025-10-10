const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing sample vendors and data...\n');

  // Get categories
  const cylinderCategory = await prisma.vendorCategoryConfig.findFirst({
    where: { slug: 'cylinder_purchase' }
  });
  const gasCategory = await prisma.vendorCategoryConfig.findFirst({
    where: { slug: 'gas_purchase' }
  });
  const vaporizerCategory = await prisma.vendorCategoryConfig.findFirst({
    where: { slug: 'vaporizer_purchase' }
  });
  const accessoriesCategory = await prisma.vendorCategoryConfig.findFirst({
    where: { slug: 'accessories_purchase' }
  });

  if (!cylinderCategory || !gasCategory || !vaporizerCategory || !accessoriesCategory) {
    console.error('❌ Please run init-vendor-categories.js first!');
    process.exit(1);
  }

  // Get admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!adminUser) {
    console.error('❌ No admin user found!');
    process.exit(1);
  }

  console.log('Creating sample vendors...\n');

  // Cylinder Purchase Vendors
  const cylinderVendors = [
    {
      vendorCode: 'VND-00001',
      name: 'Khattak Plant',
      companyName: 'Khattak Plant',
      categoryId: cylinderCategory.id,
      phone: '0300-1234567',
      address: 'Industrial Area, Peshawar'
    },
    {
      vendorCode: 'VND-00002',
      name: 'Ali Dealer',
      companyName: 'Ali Dealer',
      categoryId: cylinderCategory.id,
      phone: '0301-2345678',
      address: 'Main Market, Peshawar'
    },
    {
      vendorCode: 'VND-00003',
      name: 'Hi-Tech',
      companyName: 'Hi-Tech',
      categoryId: cylinderCategory.id,
      phone: '0302-3456789',
      address: 'Industrial Estate, Hayatabad'
    }
  ];

  // Gas Purchase Vendors
  const gasVendors = [
    {
      vendorCode: 'VND-00004',
      name: 'Khattak Plant',
      companyName: 'Khattak Plant',
      categoryId: gasCategory.id,
      phone: '0300-1234567',
      address: 'Industrial Area, Peshawar'
    },
    {
      vendorCode: 'VND-00005',
      name: 'Afridi Plant',
      companyName: 'Afridi Plant',
      categoryId: gasCategory.id,
      phone: '0303-4567890',
      address: 'Ring Road, Peshawar'
    },
    {
      vendorCode: 'VND-00006',
      name: 'Fata Plant',
      companyName: 'Fata Plant',
      categoryId: gasCategory.id,
      phone: '0304-5678901',
      address: 'GT Road, Peshawar'
    }
  ];

  // Vaporizer Purchase Vendors
  const vaporizerVendors = [
    {
      vendorCode: 'VND-00007',
      name: 'Iqbal Energy',
      companyName: 'Iqbal Energy',
      categoryId: vaporizerCategory.id,
      phone: '0305-6789012',
      address: 'Karkhano Market, Peshawar'
    },
    {
      vendorCode: 'VND-00008',
      name: 'Hass Vaporizer',
      companyName: 'Hass Vaporizer',
      categoryId: vaporizerCategory.id,
      phone: '0306-7890123',
      address: 'Industrial Zone, Peshawar'
    },
    {
      vendorCode: 'VND-00009',
      name: 'Fakhar Vaporizer',
      companyName: 'Fakhar Vaporizer',
      categoryId: vaporizerCategory.id,
      phone: '0307-8901234',
      address: 'Hayatabad Industrial Estate'
    }
  ];

  // Accessories Purchase Vendors
  const accessoriesVendors = [
    {
      vendorCode: 'VND-00010',
      name: 'Daud Reeta Bazar',
      companyName: 'Daud Reeta Bazar',
      categoryId: accessoriesCategory.id,
      phone: '0308-9012345',
      address: 'Reeta Bazar, Peshawar'
    },
    {
      vendorCode: 'VND-00011',
      name: 'Imtiaaz Reeta Bazar',
      companyName: 'Imtiaaz Reeta Bazar',
      categoryId: accessoriesCategory.id,
      phone: '0309-0123456',
      address: 'Reeta Bazar, Peshawar'
    },
    {
      vendorCode: 'VND-00012',
      name: 'Jamal Gujrawala',
      companyName: 'Jamal Gujrawala',
      categoryId: accessoriesCategory.id,
      phone: '0310-1234567',
      address: 'Gujrawala Market, Peshawar'
    }
  ];

  const allVendors = [
    ...cylinderVendors,
    ...gasVendors,
    ...vaporizerVendors,
    ...accessoriesVendors
  ];

  for (const vendor of allVendors) {
    try {
      const existing = await prisma.vendor.findFirst({
        where: { vendorCode: vendor.vendorCode }
      });

      if (existing) {
        console.log(`✓ Vendor "${vendor.name}" already exists, skipping...`);
        continue;
      }

      const created = await prisma.vendor.create({
        data: vendor
      });

      console.log(`✓ Created vendor: ${created.name} (${created.vendorCode})`);

      // Add sample items for each vendor
      if (vendor.categoryId === cylinderCategory.id || vendor.categoryId === gasCategory.id) {
        await prisma.vendorItem.createMany({
          data: [
            {
              vendorId: created.id,
              name: 'Domestic (11.8kg) Cylinder',
              category: 'Cylinder',
              sortOrder: 1
            },
            {
              vendorId: created.id,
              name: 'Standard (15kg) Cylinder',
              category: 'Cylinder',
              sortOrder: 2
            },
            {
              vendorId: created.id,
              name: 'Commercial (45.4kg) Cylinder',
              category: 'Cylinder',
              sortOrder: 3
            }
          ]
        });
        console.log(`  ✓ Added cylinder items`);
      } else if (vendor.categoryId === vaporizerCategory.id) {
        await prisma.vendorItem.createMany({
          data: [
            {
              vendorId: created.id,
              name: '20kg Vaporizer',
              category: 'Vaporizer',
              sortOrder: 1
            },
            {
              vendorId: created.id,
              name: '30kg Vaporizer',
              category: 'Vaporizer',
              sortOrder: 2
            },
            {
              vendorId: created.id,
              name: '40kg Vaporizer',
              category: 'Vaporizer',
              sortOrder: 3
            }
          ]
        });
        console.log(`  ✓ Added vaporizer items`);
      } else if (vendor.categoryId === accessoriesCategory.id) {
        await prisma.vendorItem.createMany({
          data: [
            {
              vendorId: created.id,
              name: 'High Pressure Regulator',
              category: 'Regulator',
              sortOrder: 1
            },
            {
              vendorId: created.id,
              name: 'Gas Stove',
              category: 'Stove',
              sortOrder: 2
            },
            {
              vendorId: created.id,
              name: 'Gas Pipe (per ft)',
              category: 'Pipe',
              sortOrder: 3
            }
          ]
        });
        console.log(`  ✓ Added accessory items`);
      }
    } catch (error) {
      console.error(`✗ Error creating vendor "${vendor.name}":`, error.message);
    }
  }

  console.log('\n📊 Summary:');
  const totalVendors = await prisma.vendor.count();
  const totalItems = await prisma.vendorItem.count();
  console.log(`Total vendors: ${totalVendors}`);
  console.log(`Total vendor items: ${totalItems}\n`);

  console.log('✅ Sample vendors initialization complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

