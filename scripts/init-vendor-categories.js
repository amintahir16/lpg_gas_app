const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing vendor categories...\n');

  const categories = [
    {
      name: 'Cylinder Purchase',
      slug: 'cylinder_purchase',
      description: 'Vendors from which you purchase cylinders like Khattak Plant, Sui Gas, Ali Plant',
      sortOrder: 1
    },
    {
      name: 'Gas Purchase',
      slug: 'gas_purchase',
      description: 'Vendors from whom you purchase gas like Ali Plant, Fata Plant, Unimax Plant',
      sortOrder: 2
    },
    {
      name: 'Vaporizer Purchase',
      slug: 'vaporizer_purchase',
      description: 'Vendors from whom you buy machinery or vaporizers like Iqbal Energy, Hass Vaporizer, Fakhar Vaporizer',
      sortOrder: 3
    },
    {
      name: 'Accessories Purchase',
      slug: 'accessories_purchase',
      description: 'Accessories alongside cylinders like Stoves, Regulators, Gas Pipes, Jets from vendors in Reeta Bazar',
      sortOrder: 4
    },
    {
      name: 'Valves Purchase',
      slug: 'valves_purchase',
      description: 'Valves and related components for cylinders',
      sortOrder: 5
    }
  ];

  console.log('Creating vendor categories...\n');

  for (const category of categories) {
    try {
      // Check if category already exists
      const existing = await prisma.vendorCategoryConfig.findFirst({
        where: {
          OR: [
            { slug: category.slug },
            { name: category.name }
          ]
        }
      });

      if (existing) {
        console.log(`✓ Category "${category.name}" already exists, skipping...`);
        continue;
      }

      const created = await prisma.vendorCategoryConfig.create({
        data: category
      });

      console.log(`✓ Created category: ${created.name}`);
    } catch (error) {
      console.error(`✗ Error creating category "${category.name}":`, error.message);
    }
  }

  console.log('\n📊 Summary:');
  const totalCategories = await prisma.vendorCategoryConfig.count();
  console.log(`Total vendor categories: ${totalCategories}\n`);

  console.log('✅ Vendor categories initialization complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

