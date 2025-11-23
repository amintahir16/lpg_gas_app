import { prisma } from '@/lib/db';

export interface VendorPurchaseItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cylinderCodes?: string;
  status?: string;
  selectedCylinderIds?: string[];
  category?: string;
  description?: string;
}

/**
 * Service to integrate vendor purchases with inventory system
 */
export class InventoryIntegrationService {
  
  /**
   * Process vendor purchase items and add them to appropriate inventory tables
   */
  static async processPurchaseItems(items: VendorPurchaseItem[], vendorCategory?: string): Promise<void> {
    console.log('🔄 Processing vendor purchase items for inventory integration...');
    console.log(`🏪 Vendor category: ${vendorCategory}`);
    
    for (const item of items) {
      try {
        await this.processItem(item, vendorCategory);
        console.log(`✅ Successfully processed: ${item.itemName} (${item.quantity} units)`);
      } catch (error) {
        console.error(`❌ Failed to process item ${item.itemName}:`, error);
        throw error; // Re-throw to fail the entire transaction
      }
    }
    
    console.log('✅ All purchase items processed successfully');
  }

  /**
   * Process individual item based on its name and type
   */
  private static async processItem(item: VendorPurchaseItem, vendorCategory?: string): Promise<void> {
    const itemName = item.itemName.toLowerCase();
    const quantity = item.quantity;
    const unitPrice = item.unitPrice;

    console.log(`🔍 Processing item: ${item.itemName} (${itemName})`);
    console.log(`🔍 Vendor category: ${vendorCategory}`);

    // Check vendor category FIRST - if it's a gas purchase vendor, all items are gas purchases
    if (this.isGasPurchaseVendor(vendorCategory)) {
      console.log(`⛽ Processing as gas purchase (vendor category: ${vendorCategory})`);
      await this.processGasPurchase(item);
      return;
    }

    // Check if this is an accessories purchase vendor
    if (this.isAccessoriesPurchaseVendor(vendorCategory)) {
      console.log(`🔧 Processing as accessories purchase (vendor category: ${vendorCategory})`);
      await this.processAccessoriesPurchase(item);
      return;
    }

    // Check if this is a vaporizer purchase vendor
    if (this.isVaporizerPurchaseVendor(vendorCategory)) {
      console.log(`⚙️ Processing as vaporizer purchase (vendor category: ${vendorCategory})`);
      await this.processVaporizerPurchase(item);
      return;
    }

    // For non-gas vendors, use item name detection
    console.log(`🔍 Is cylinder item: ${this.isCylinderItem(itemName)}`);
    console.log(`🔍 Is gas item: ${this.isGasItem(itemName)}`);

    if (this.isCylinderItem(itemName)) {
      console.log(`📦 Processing as cylinder purchase`);
      await this.processCylinderPurchase(item);
    } else {
      console.log(`📦 Processing as generic product`);
      // Generic product - add to Product table
      await this.processGenericProduct(item);
    }
  }

  /**
   * Check if vendor is a gas purchase vendor
   */
  private static isGasPurchaseVendor(categorySlug?: string): boolean {
    if (!categorySlug) return false;
    
    const normalizedSlug = categorySlug.toLowerCase().replace(/[_-]/g, '');
    const gasPatterns = [
      'gaspurchase',
      'gasfilling',
      'gasrefill',
      'gasrefilling'
    ];
    
    return gasPatterns.some(pattern => normalizedSlug.includes(pattern));
  }

  /**
   * Check if vendor is an accessories purchase vendor
   */
  private static isAccessoriesPurchaseVendor(categorySlug?: string): boolean {
    if (!categorySlug) return false;
    
    const normalizedSlug = categorySlug.toLowerCase().replace(/[_-]/g, '');
    const accessoriesPatterns = [
      'accessoriespurchase',
      'accessories_purchase',
      'accessorypurchase',
      'accessory_purchase'
    ];
    
    return accessoriesPatterns.some(pattern => normalizedSlug.includes(pattern));
  }

  /**
   * Check if vendor is a vaporizer purchase vendor
   */
  private static isVaporizerPurchaseVendor(categorySlug?: string): boolean {
    if (!categorySlug) return false;
    
    const normalizedSlug = categorySlug.toLowerCase().replace(/[_-]/g, '');
    const vaporizerPatterns = [
      'vaporizerpurchase',
      'vaporizer_purchase',
      'vaporiserpurchase',
      'vaporiser_purchase'
    ];
    
    return vaporizerPatterns.some(pattern => normalizedSlug.includes(pattern));
  }

  /**
   * Check if item is a cylinder
   */
  private static isCylinderItem(itemName: string): boolean {
    const cylinderKeywords = [
      'cylinder', 'gas cylinder', 'lpg cylinder'
    ];
    
    // More specific patterns for cylinder purchases (not gas filling)
    const cylinderPatterns = [
      'domestic cylinder', 'standard cylinder', 'commercial cylinder',
      '11.8kg cylinder', '15kg cylinder', '45.4kg cylinder',
      'domestic (11.8kg)', 'standard (15kg)', 'commercial (45.4kg)'
    ];
    
    return cylinderKeywords.some(keyword => itemName.includes(keyword)) ||
           cylinderPatterns.some(pattern => itemName.includes(pattern));
  }

  /**
   * Check if item is a gas purchase (for filling empty cylinders)
   */
  private static isGasItem(itemName: string): boolean {
    const gasKeywords = [
      'gas', 'domestic gas', 'standard gas', 'commercial gas',
      '11.8kg gas', '15kg gas', '45.4kg gas',
      'domestic (11.8kg) gas', 'standard (15kg) gas', 'commercial (45.4kg) gas'
    ];
    return gasKeywords.some(keyword => itemName.toLowerCase().includes(keyword));
  }

  /**
   * Generate a unique cylinder code based on cylinder type
   */
  private static async generateUniqueCylinderCode(cylinderType: string): Promise<string> {
    // Determine prefix based on cylinder type
    let prefix: string;
    if (cylinderType === 'DOMESTIC_11_8KG') {
      prefix = 'DM';
    } else if (cylinderType === 'STANDARD_15KG') {
      prefix = 'ST';
    } else if (cylinderType === 'COMMERCIAL_45_4KG') {
      prefix = 'CM';
    } else {
      prefix = 'CYL'; // Fallback for unknown types
    }
    
    // Find the highest existing number for this prefix
    const existingCylinders = await prisma.cylinder.findMany({
      where: {
        code: {
          startsWith: prefix
        }
      },
      select: {
        code: true
      }
    });
    
    // Extract numbers from existing codes and find the highest
    let maxNumber = 0;
    existingCylinders.forEach(cylinder => {
      const match = cylinder.code.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    });
    
    // Generate the next sequential number
    const nextNumber = maxNumber + 1;
    const cylinderCode = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    
    // Double-check that this code doesn't exist (safety check)
    const existingCylinder = await prisma.cylinder.findUnique({
      where: { code: cylinderCode }
    });
    
    if (existingCylinder) {
      // If somehow it exists, add a timestamp to make it unique
      const timestamp = Date.now().toString().slice(-6);
      return `${prefix}${nextNumber.toString().padStart(3, '0')}-${timestamp}`;
    }
    
    return cylinderCode;
  }

  /**
   * Process gas purchases - automatically find and update empty cylinders to FULL status
   */
  private static async processGasPurchase(item: VendorPurchaseItem): Promise<void> {
    const { itemName, quantity: rawQuantity } = item;
    const quantity = Number(rawQuantity);
    
    console.log(`🔄 Processing gas purchase: ${itemName} (${quantity} units)`);
    
    if (quantity <= 0) {
      console.log(`⚠️ Invalid quantity for gas purchase: ${itemName}`);
      return;
    }

    // Determine cylinder type based on gas type (case-insensitive, handles various formats)
    // Dynamically extracts weight from item name to match any cylinder type
    const name = itemName.toLowerCase();
    let cylinderType = '';
    
    // Extract weight from item name (handles patterns like "6kg", "11.8kg", "15kg", "30kg", "45.4kg")
    const weightMatch = name.match(/(\d+\.?\d*)\s*kg/i);
    
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1]);
      
      // Map common weights to cylinder types (includes new types: 6kg, 30kg)
      if (Math.abs(weight - 6) < 0.1) {
        cylinderType = 'CYLINDER_6KG';
      } else if (Math.abs(weight - 11.8) < 0.1 || name.includes('domestic')) {
        cylinderType = 'DOMESTIC_11_8KG';
      } else if (Math.abs(weight - 15) < 0.1 || name.includes('standard')) {
        cylinderType = 'STANDARD_15KG';
      } else if (Math.abs(weight - 30) < 0.1) {
        cylinderType = 'CYLINDER_30KG';
      } else if (Math.abs(weight - 45.4) < 0.1 || name.includes('commercial')) {
        cylinderType = 'COMMERCIAL_45_4KG';
      } else {
        // For unknown weights, try keyword matching as fallback
        if (name.includes('domestic') || name.includes('11.8')) {
          cylinderType = 'DOMESTIC_11_8KG';
        } else if (name.includes('commercial') || name.includes('45.4')) {
          cylinderType = 'COMMERCIAL_45_4KG';
        } else if (name.includes('standard') || name.includes('15kg') || name.includes('15 kg')) {
          cylinderType = 'STANDARD_15KG';
        } else if (name.includes('6kg') || name.includes('6 kg')) {
          cylinderType = 'CYLINDER_6KG';
        } else if (name.includes('30kg') || name.includes('30 kg')) {
          cylinderType = 'CYLINDER_30KG';
        } else {
          console.log(`⚠️ Unknown gas type: ${itemName} (weight: ${weight}kg)`);
          return;
        }
      }
    } else {
      // Fallback to keyword matching if no weight pattern found
      if (name.includes('domestic') || name.includes('11.8')) {
        cylinderType = 'DOMESTIC_11_8KG';
      } else if (name.includes('commercial') || name.includes('45.4')) {
        cylinderType = 'COMMERCIAL_45_4KG';
      } else if (name.includes('standard') || name.includes('15kg') || name.includes('15 kg')) {
        cylinderType = 'STANDARD_15KG';
      } else if (name.includes('6kg') || name.includes('6 kg')) {
        cylinderType = 'CYLINDER_6KG';
      } else if (name.includes('30kg') || name.includes('30 kg')) {
        cylinderType = 'CYLINDER_30KG';
      } else {
        console.log(`⚠️ Unknown gas type: ${itemName}`);
        return;
      }
    }

    console.log(`🔍 Looking for ${quantity} empty ${cylinderType} cylinders`);

    // Find empty cylinders of the matching type
    const emptyCylinders = await prisma.cylinder.findMany({
      where: {
        cylinderType: cylinderType as any,
        currentStatus: 'EMPTY'
      },
      take: quantity,
      orderBy: {
        createdAt: 'asc' // Take oldest empty cylinders first
      }
    });

    if (emptyCylinders.length < quantity) {
      const errorMessage = `Not enough empty ${cylinderType} cylinders available. Found: ${emptyCylinders.length}, Needed: ${quantity}`;
      console.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Update found cylinders to FULL status
    const cylinderIds = emptyCylinders.map(cylinder => cylinder.id);
    const updateResult = await prisma.cylinder.updateMany({
      where: {
        id: {
          in: cylinderIds
        }
      },
      data: {
        currentStatus: 'FULL'
      }
    });

    console.log(`✅ Updated ${updateResult.count} ${cylinderType} cylinders to FULL status for gas purchase: ${itemName}`);
  }

  /**
   * Process accessories purchase - add to CustomItem table
   */
  private static async processAccessoriesPurchase(item: VendorPurchaseItem): Promise<void> {
    const itemName = item.itemName; // This becomes the "type" in inventory
    const quantity = Number(item.quantity); // Ensure it's a number
    const unitPrice = Number(item.unitPrice); // Ensure it's a number
    const totalCost = quantity * unitPrice;

    console.log(`🔧 Processing accessories purchase: ${itemName} (${quantity} units at ${unitPrice} each)`);

    // Get the category from the vendor item - this is the key part!
    // The category should come from the vendor item, not determined by name
    const category = item.category || this.determineAccessoryCategory(itemName);
    
    console.log(`📂 Using category: ${category} for item: ${itemName}`);
    
    // Use CustomItem table for all accessories
    await this.processCustomItemPurchase(item, category);
  }

  /**
   * Process vaporizer purchase - add to CustomItem table (same as accessories)
   */
  private static async processVaporizerPurchase(item: VendorPurchaseItem): Promise<void> {
    const itemName = item.itemName; // This becomes the "type" in inventory
    const quantity = Number(item.quantity); // Ensure it's a number
    const unitPrice = Number(item.unitPrice); // Ensure it's a number
    const totalCost = quantity * unitPrice;

    console.log(`⚙️ Processing vaporizer purchase: ${itemName} (${quantity} units at ${unitPrice} each)`);

    // Get the category from the vendor item - this is the key part!
    // The category should come from the vendor item, not determined by name
    const category = item.category || this.determineVaporizerCategory(itemName);
    
    console.log(`📂 Using category: ${category} for item: ${itemName}`);
    
    // Use CustomItem table for all vaporizers (same as accessories)
    await this.processCustomItemPurchase(item, category);
  }


  /**
   * Process custom item purchase - add to CustomItem table for other categories
   */
  private static async processCustomItemPurchase(item: VendorPurchaseItem, category: string): Promise<void> {
    const itemName = item.itemName;
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const totalCost = quantity * unitPrice;

    console.log(`🔧 Processing custom item purchase: ${itemName} in ${category} (${quantity} units at ${unitPrice} each)`);

    // Normalize category name to handle case sensitivity
    const normalizedCategory = this.normalizeCategoryName(category);
    console.log(`📝 Normalized category: ${category} → ${normalizedCategory}`);

    // Check if item already exists in CustomItem table (case-insensitive search)
    const existingItem = await prisma.customItem.findFirst({
      where: {
        name: {
          equals: normalizedCategory,
          mode: 'insensitive'
        },
        type: itemName,
        isActive: true
      }
    });

    if (existingItem) {
      // Update existing item
      const newQuantity = existingItem.quantity + quantity;
      const newTotalCost = newQuantity * unitPrice;
      
      await prisma.customItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          costPerPiece: unitPrice,
          totalCost: newTotalCost
        }
      });

      console.log(`✅ Updated existing custom item: ${itemName} in ${normalizedCategory} (${existingItem.quantity} → ${newQuantity} units)`);
    } else {
      // Create new item with normalized category name
      await prisma.customItem.create({
        data: {
          name: normalizedCategory,
          type: itemName,
          quantity: quantity,
          costPerPiece: unitPrice,
          totalCost: totalCost
        }
      });

      console.log(`✅ Created new custom item: ${itemName} in ${normalizedCategory} (${quantity} units)`);
    }
  }

  /**
   * Normalize category name to handle case sensitivity and variations
   */
  private static normalizeCategoryName(category: string): string {
    const normalized = category.toLowerCase().trim();
    
    // Handle common variations
    if (normalized === 'stove' || normalized === 'stoves') {
      return 'Stoves';
    } else if (normalized === 'regulator' || normalized === 'regulators') {
      return 'Regulators';
    } else if (normalized === 'valve' || normalized === 'valves') {
      return 'Valves';
    } else if (normalized === 'pipe' || normalized === 'pipes' || normalized === 'gas pipe' || normalized === 'gas pipes') {
      return 'Gas Pipes';
    } else if (normalized === 'vaporizer' || normalized === 'vaporizers' || normalized === 'vaporiser' || normalized === 'vaporisers') {
      return 'Vaporizers';
    } else {
      // Capitalize first letter for other categories
      return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    }
  }

  /**
   * Determine accessory category based on item name
   */
  private static determineAccessoryCategory(itemName: string): string {
    const name = itemName.toLowerCase();
    
    if (name.includes('valve')) {
      return 'Valves';
    } else if (name.includes('regulator')) {
      return 'Regulators';
    } else if (name.includes('stove') || name.includes('burner')) {
      return 'Stoves';
    } else if (name.includes('pipe') || name.includes('hose')) {
      return 'Gas Pipes';
    } else {
      // Default category for other accessories
      return 'Accessories';
    }
  }

  /**
   * Determine vaporizer category based on item name
   */
  private static determineVaporizerCategory(itemName: string): string {
    const name = itemName.toLowerCase();
    
    if (name.includes('vaporizer') || name.includes('vaporiser')) {
      return 'Vaporizers';
    } else if (name.includes('20kg')) {
      return 'Vaporizers';
    } else if (name.includes('30kg')) {
      return 'Vaporizers';
    } else if (name.includes('40kg')) {
      return 'Vaporizers';
    } else {
      // Default category for other vaporizer equipment
      return 'Vaporizers';
    }
  }

  /**
   * Process cylinder purchases - create individual cylinder records
   */
  private static async processCylinderPurchase(item: VendorPurchaseItem): Promise<void> {
    const { itemName, quantity: rawQuantity, unitPrice: rawUnitPrice, cylinderCodes, status } = item;
    const quantity = Number(rawQuantity);
    const unitPrice = Number(rawUnitPrice);
    
    // Extract cylinder type from item name
    const cylinderType = this.extractCylinderType(itemName);
    
    // Use status from form, default to 'EMPTY' if not provided
    const cylinderStatus = status || 'EMPTY';
    
    // If cylinder codes are provided, use them; otherwise generate
    const codes = cylinderCodes ? cylinderCodes.split(',').map(c => c.trim()) : [];
    
    // Create individual cylinder records
    for (let i = 0; i < quantity; i++) {
      // Generate unique codes based on cylinder type
      const cylinderCode = await this.generateUniqueCylinderCode(cylinderType);
      
      await prisma.cylinder.create({
        data: {
          code: cylinderCode,
          cylinderType,
          capacity: this.getCylinderCapacity(cylinderType),
          currentStatus: cylinderStatus as any, // Use status from form
          location: 'Store',
          purchaseDate: new Date(),
          purchasePrice: unitPrice
        }
      });
    }
    
    console.log(`📦 Created ${quantity} ${cylinderType} cylinders with status: ${cylinderStatus}`);
  }

  /**
   * Process generic products - add to Product table
   */
  private static async processGenericProduct(item: VendorPurchaseItem): Promise<void> {
    const { itemName, quantity: rawQuantity, unitPrice: rawUnitPrice } = item;
    const quantity = Number(rawQuantity);
    const unitPrice = Number(rawUnitPrice);
    
    // Find existing product or create new one
    const existingProduct = await prisma.product.findFirst({
      where: {
        name: {
          contains: itemName,
          mode: 'insensitive'
        }
      }
    });
    
    if (existingProduct) {
      // Update existing product
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          stockQuantity: { increment: quantity }
        }
      });
      console.log(`📦 Updated product: ${existingProduct.name} (+${quantity} units)`);
    } else {
      // Create new product
      await prisma.product.create({
        data: {
          name: itemName,
          category: 'ACCESSORY',
          unit: 'piece',
          stockQuantity: quantity,
          stockType: 'FILLED',
          priceSoldToCustomer: unitPrice * 1.2, // 20% markup
          lowStockThreshold: 10,
          isActive: true
        }
      });
      console.log(`📦 Created new product: ${itemName} (${quantity} units)`);
    }
  }

  /**
   * Extract cylinder type from item name (dynamic - handles any cylinder type)
   */
  private static extractCylinderType(itemName: string): string {
    const name = itemName.toLowerCase();
    
    // Extract weight from item name (handles patterns like "6kg", "11.8kg", "15kg", "30kg", "45.4kg")
    const weightMatch = name.match(/(\d+\.?\d*)\s*kg/i);
    
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1]);
      
      // Map weights to cylinder types (can be extended for new types)
      if (Math.abs(weight - 6) < 0.1) {
        return 'CYLINDER_6KG';
      } else if (Math.abs(weight - 11.8) < 0.1 || name.includes('domestic')) {
        return 'DOMESTIC_11_8KG';
      } else if (Math.abs(weight - 15) < 0.1 || name.includes('standard')) {
        return 'STANDARD_15KG';
      } else if (Math.abs(weight - 30) < 0.1) {
        return 'CYLINDER_30KG';
      } else if (Math.abs(weight - 45.4) < 0.1 || name.includes('commercial')) {
        return 'COMMERCIAL_45_4KG';
      }
    }
    
    // Fallback to keyword matching
    if (name.includes('domestic') || name.includes('11.8')) {
      return 'DOMESTIC_11_8KG';
    } else if (name.includes('commercial') || name.includes('45.4')) {
      return 'COMMERCIAL_45_4KG';
    } else if (name.includes('standard') || name.includes('15kg') || name.includes('15 kg')) {
      return 'STANDARD_15KG';
    } else if (name.includes('6kg') || name.includes('6 kg')) {
      return 'CYLINDER_6KG';
    } else if (name.includes('30kg') || name.includes('30 kg')) {
      return 'CYLINDER_30KG';
    }
    
    // Default to 15kg if no match found
    return 'STANDARD_15KG';
  }

  /**
   * Get cylinder capacity based on type (dynamic - extracts weight from enum name)
   */
  private static getCylinderCapacity(type: string): number {
    // Extract weight from cylinder type enum name (e.g., "CYLINDER_6KG" -> 6, "DOMESTIC_11_8KG" -> 11.8)
    const weightMatch = type.match(/(\d+\.?\d*)/);
    if (weightMatch) {
      return parseFloat(weightMatch[1]);
    }
    
    // Fallback for known types (backward compatibility)
    switch (type) {
      case 'DOMESTIC_11_8KG': return 11.8;
      case 'STANDARD_15KG': return 15.0;
      case 'COMMERCIAL_45_4KG': return 45.4;
      case 'CYLINDER_6KG': return 6.0;
      case 'CYLINDER_30KG': return 30.0;
      default: return 15.0; // Default fallback
    }
  }
}

