import { prisma } from './db';

/**
 * Default margin categories required for the system to function properly.
 * These are the standard categories that should always be available.
 */
export const DEFAULT_CATEGORIES = {
  B2C: [
    {
      name: 'All Homes',
      customerType: 'B2C' as const,
      marginPerKg: 65,
      description: 'Standard margin for all residential customers',
      sortOrder: 1,
      isActive: true,
    },
  ],
  B2B: [
    {
      name: '1 & 2C Demand Weekly',
      customerType: 'B2B' as const,
      marginPerKg: 32,
      description: 'Small commercial customers with 1-2 cylinder weekly demand',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: '3C Demand Weekly',
      customerType: 'B2B' as const,
      marginPerKg: 28,
      description: 'Medium commercial customers with 3 cylinder weekly demand',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: '4C & above demand weekly',
      customerType: 'B2B' as const,
      marginPerKg: 23,
      description: 'Large commercial customers with 4+ cylinder weekly demand',
      sortOrder: 3,
      isActive: true,
    },
    {
      name: 'Majority 15kg Customers',
      customerType: 'B2B' as const,
      marginPerKg: 45,
      description: 'Commercial customers primarily using 15kg cylinders',
      sortOrder: 4,
      isActive: true,
    },
    {
      name: 'Special 15kg',
      customerType: 'B2B' as const,
      marginPerKg: 35,
      description: 'Special commercial customers with 15kg cylinder preference',
      sortOrder: 5,
      isActive: true,
    },
  ],
};

/**
 * Initializes default margin categories for a specific customer type.
 * This is idempotent - safe to call multiple times.
 * 
 * @param customerType - 'B2C' or 'B2B' to initialize specific type, or 'ALL' for both
 * @returns Object with created and updated counts
 */
export async function initializeDefaultCategories(
  customerType: 'B2C' | 'B2B' | 'ALL' = 'ALL'
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  try {
    const categoriesToInit = 
      customerType === 'ALL' 
        ? [...DEFAULT_CATEGORIES.B2C, ...DEFAULT_CATEGORIES.B2B]
        : customerType === 'B2C'
        ? DEFAULT_CATEGORIES.B2C
        : DEFAULT_CATEGORIES.B2B;

    for (const categoryData of categoriesToInit) {
      // Check if category already exists
      const existingCategory = await prisma.marginCategory.findFirst({
        where: {
          name: categoryData.name,
          customerType: categoryData.customerType,
        },
      });

      if (existingCategory) {
        // Update existing category to ensure correct values
        await prisma.marginCategory.update({
          where: { id: existingCategory.id },
          data: {
            marginPerKg: categoryData.marginPerKg,
            description: categoryData.description,
            sortOrder: categoryData.sortOrder,
            isActive: categoryData.isActive,
          },
        });
        updated++;
      } else {
        // Create new category
        await prisma.marginCategory.create({
          data: categoryData,
        });
        created++;
      }
    }

    return { created, updated };
  } catch (error) {
    console.error('Error initializing default categories:', error);
    throw error;
  }
}

/**
 * Checks if default categories exist and initializes them if missing.
 * This is a safety net that runs automatically in API routes.
 * 
 * @param customerType - Optional: 'B2C' or 'B2B' to check specific type
 * @returns true if categories were created, false if they already existed
 */
export async function ensureDefaultCategoriesExist(
  customerType?: 'B2C' | 'B2B'
): Promise<boolean> {
  try {
    // Check if any categories exist for the specified type
    const whereClause = customerType 
      ? { customerType } 
      : {};
    
    const existingCount = await prisma.marginCategory.count({
      where: whereClause,
    });

    // If no categories exist, initialize them
    if (existingCount === 0) {
      await initializeDefaultCategories(customerType || 'ALL');
      return true; // Categories were created
    }

    return false; // Categories already existed
  } catch (error) {
    console.error('Error ensuring default categories:', error);
    // Don't throw - we don't want to break API calls if initialization fails
    // The seed script or manual initialization should handle this
    return false;
  }
}

