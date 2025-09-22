const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateCylinderProducts() {
  try {
    console.log('Creating cylinder products for inventory tracking...');

    // Create cylinder products
    const cylinderProducts = [
      {
        name: 'Gas Cylinder 11.8kg',
        category: 'GAS_CYLINDER',
        unit: 'piece',
        stockQuantity: 100,
        stockType: 'FILLED',
        priceSoldToCustomer: 2500,
        lowStockThreshold: 10,
      },
      {
        name: 'Gas Cylinder 15kg',
        category: 'GAS_CYLINDER',
        unit: 'piece',
        stockQuantity: 150,
        stockType: 'FILLED',
        priceSoldToCustomer: 3000,
        lowStockThreshold: 15,
      },
      {
        name: 'Gas Cylinder 45.4kg',
        category: 'GAS_CYLINDER',
        unit: 'piece',
        stockQuantity: 50,
        stockType: 'FILLED',
        priceSoldToCustomer: 8000,
        lowStockThreshold: 5,
      }
    ];

    // Create cylinder products
    for (const productData of cylinderProducts) {
      const existingProduct = await prisma.product.findFirst({
        where: { name: productData.name }
      });

      if (existingProduct) {
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: productData,
        });
        console.log(`Updated cylinder product: ${productData.name}`);
      } else {
        await prisma.product.create({
          data: productData,
        });
        console.log(`Created cylinder product: ${productData.name}`);
      }
    }

    console.log('Cylinder products created successfully!');
  } catch (error) {
    console.error('Error creating cylinder products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateCylinderProducts();
