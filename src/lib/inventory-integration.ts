import { prisma } from '@/lib/db';
import { generateCylinderTypeFromCapacity, normalizeTypeName } from './cylinder-utils';

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

    // Check if this is a valves purchase vendor
    if (this.isValvesPurchaseVendor(vendorCategory)) {
      console.log(`🔧 Processing as valves purchase (vendor category: ${vendorCategory})`);
      await this.processValvesPurchase(item);
      return;
    }

    // Check if this is a cylinder purchase vendor
    // If vendor is a cylinder purchase vendor, ALL items should be processed as cylinders
    if (this.isCylinderPurchaseVendor(vendorCategory)) {
      console.log(`📦 Processing as cylinder purchase (vendor category: ${vendorCategory})`);
      await this.processCylinderPurchase(item);
      return;
    }

    // For other vendors, use item name detection as fallback
    console.log(`🔍 Is cylinder item: ${this.isCylinderItem(itemName)}`);
    console.log(`🔍 Is gas item: ${this.isGasItem(itemName)}`);

    if (this.isCylinderItem(itemName)) {
      console.log(`📦 Processing as cylinder purchase (detected from item name)`);
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
   * Check if vendor is a valves purchase vendor
   */
  private static isValvesPurchaseVendor(categorySlug?: string): boolean {
    if (!categorySlug) return false;
    
    const normalizedSlug = categorySlug.toLowerCase().replace(/[_-]/g, '');
    const valvesPatterns = [
      'valvespurchase',
      'valves_purchase',
      'valvepurchase',
      'valve_purchase'
    ];
    
    return valvesPatterns.some(pattern => normalizedSlug.includes(pattern));
  }

  /**
   * Check if vendor is a cylinder purchase vendor
   * If vendor is a cylinder purchase vendor, ALL items should be processed as cylinders
   * regardless of item name (e.g., "plastic 12kg", "commercial 45.4kg", etc.)
   */
  private static isCylinderPurchaseVendor(categorySlug?: string): boolean {
    if (!categorySlug) return false;
    
    const normalizedSlug = categorySlug.toLowerCase().replace(/[_-]/g, '');
    const cylinderPurchasePatterns = [
      'cylinderpurchase',
      'cylinderspurchase',
      'cylinder_purchase',
      'cylinders_purchase',
      'cylinderpurchases',
      'cylinderspurchases'
    ];
    
    return cylinderPurchasePatterns.some(pattern => normalizedSlug.includes(pattern));
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
  // Code generation moved to shared utility: @/lib/cylinder-code-generator
  // This method is kept for backward compatibility but now uses the shared function
  private static async generateUniqueCylinderCode(cylinderType: string): Promise<string> {
    const { generateUniqueCylinderCode: generateCode } = await import('@/lib/cylinder-code-generator');
    // Pass cylinderType as enum (isTypeName = false)
    return generateCode(cylinderType, false);
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

    // Determine cylinder type based on gas type - fully dynamic approach
    // Extract capacity from item name and generate enum dynamically
    const name = itemName.toLowerCase();
    
    // Extract weight/capacity from item name (handles patterns like "6kg", "11.8kg", "15kg", "30kg", "45.4kg", etc.)
    const weightMatch = name.match(/(\d+\.?\d*)\s*kg/i);
    
    if (!weightMatch) {
      console.log(`⚠️ Could not extract capacity from gas type: ${itemName}`);
      return;
    }
    
    const capacity = parseFloat(weightMatch[1]);
    
    // Validate capacity
    if (isNaN(capacity) || capacity <= 0) {
      console.log(`⚠️ Invalid capacity extracted from gas type: ${itemName} (capacity: ${capacity})`);
      return;
    }
    
    // Generate enum type dynamically from capacity - fully flexible
    const cylinderType = generateCylinderTypeFromCapacity(capacity);

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
   * Process valves purchase - add to CustomItem table with "Valves" category
   */
  private static async processValvesPurchase(item: VendorPurchaseItem): Promise<void> {
    const itemName = item.itemName; // This becomes the "type" in inventory
    const quantity = Number(item.quantity); // Ensure it's a number
    const unitPrice = Number(item.unitPrice); // Ensure it's a number
    const totalCost = quantity * unitPrice;

    console.log(`🔧 Processing valves purchase: ${itemName} (${quantity} units at ${unitPrice} each)`);

    // Always use "Valves" category for valves purchases
    // The category should come from the vendor item if available, otherwise default to "Valves"
    const category = item.category || 'Valves';
    
    // Normalize to "Valves" to ensure consistency
    const normalizedCategory = this.normalizeCategoryName(category);
    
    console.log(`📂 Using category: ${normalizedCategory} for item: ${itemName}`);
    
    // Use CustomItem table for all valves (same as accessories and vaporizers)
    await this.processCustomItemPurchase(item, normalizedCategory);
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
    
    // Extract typeName from item name (e.g., "Domestic 11.8kg" -> "Domestic")
    // This ensures vendor-purchased cylinders group correctly with manually added ones in stats
    const typeName = this.extractTypeNameFromItemName(itemName);
    
    // Extract capacity directly from item name (e.g., "Industrial 20kg" -> 20)
    // This ensures new custom cylinder types get the correct capacity instead of defaulting to 15kg
    // Priority: extracted capacity > getCylinderCapacity(cylinderType) > 15.0 (fallback)
    const extractedCapacity = this.extractCapacityFromItemName(itemName);
    const capacity = extractedCapacity !== null 
      ? extractedCapacity 
      : this.getCylinderCapacity(cylinderType);
    
    // Use status from form, default to 'EMPTY' if not provided
    const cylinderStatus = status || 'EMPTY';
    
    // If cylinder codes are provided, use them; otherwise generate
    const codes = cylinderCodes ? cylinderCodes.split(',').map(c => c.trim()) : [];
    
    // Create individual cylinder records
    for (let i = 0; i < quantity; i++) {
      // Use provided code if available, otherwise generate unique code based on cylinder type
      let cylinderCode: string;
      if (codes[i] && codes[i].trim()) {
        // Use the provided code from the form
        cylinderCode = codes[i].trim();
      } else {
        // Generate unique code using shared utility
        // Use typeName if available, otherwise fall back to cylinderType
        const codeInput = typeName || cylinderType;
        const isTypeName = !!typeName;
        const { generateUniqueCylinderCode } = await import('@/lib/cylinder-code-generator');
        cylinderCode = await generateUniqueCylinderCode(codeInput, isTypeName);
      }
      
      await prisma.cylinder.create({
        data: {
          code: cylinderCode,
          cylinderType,
          typeName: typeName || null, // Set typeName for proper grouping in stats
          capacity: capacity, // Use extracted capacity (handles new custom types correctly)
          currentStatus: cylinderStatus as any, // Use status from form
          location: 'Store',
          purchaseDate: new Date(),
          purchasePrice: unitPrice
        }
      });
    }
    
    console.log(`📦 Created ${quantity} ${cylinderType} cylinders with typeName: ${typeName || 'null'}, capacity: ${capacity}kg, status: ${cylinderStatus}`);
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
   * Extract cylinder type from item name (fully dynamic - handles any cylinder type)
   */
  private static extractCylinderType(itemName: string): string {
    const name = itemName.toLowerCase();
    
    // Extract weight/capacity from item name (handles patterns like "6kg", "11.8kg", "15kg", "30kg", "45.4kg", etc.)
    const weightMatch = name.match(/(\d+\.?\d*)\s*kg/i);
    
    if (weightMatch) {
      const capacity = parseFloat(weightMatch[1]);
      
      // Validate capacity
      if (!isNaN(capacity) && capacity > 0) {
        // Generate enum type dynamically from capacity - fully flexible
        return generateCylinderTypeFromCapacity(capacity);
      }
    }
    
    // If no capacity found, log warning and return a default (this should rarely happen)
    console.log(`⚠️ Could not extract capacity from item name: ${itemName}, using default`);
    return 'STANDARD_15KG';
  }

  /**
   * Extract capacity from item name (e.g., "Domestic 11.8kg" -> 11.8, "Industrial (20kg)" -> 20)
   * This ensures vendor-purchased cylinders store the correct capacity, especially for new custom types
   * Handles multiple formats:
   * - "Domestic 11.8kg" -> 11.8
   * - "Domestic (11.8kg)" -> 11.8
   * - "Industrial 20kg" -> 20
   * - "Special (10kg)" -> 10
   */
  private static extractCapacityFromItemName(itemName: string): number | null {
    if (!itemName) return null;
    
    const name = itemName.trim();
    
    // Extract capacity from item name
    // Handles formats:
    // - "Domestic 11.8kg" -> 11.8
    // - "Domestic (11.8kg)" -> 11.8
    // - "Industrial 20 kg" -> 20
    // Pattern: optional parentheses, numbers (with optional decimal), optional space, and "kg"
    const capacityMatch = name.match(/(?:\(?)(\d+\.?\d*)\s*kg\)?/i);
    
    if (capacityMatch && capacityMatch[1]) {
      const capacity = parseFloat(capacityMatch[1]);
      // Validate capacity is a reasonable number (between 0.1 and 1000 kg)
      if (!isNaN(capacity) && capacity > 0.1 && capacity <= 1000) {
        return capacity;
      }
    }
    
    // If no match found, return null (will fall back to getCylinderCapacity)
    return null;
  }

  /**
   * Extract type name from item name (e.g., "Domestic 11.8kg" -> "Domestic", "Domestic (11.8kg)" -> "Domestic")
   * This ensures vendor-purchased cylinders group correctly with manually added ones in stats
   * Handles multiple formats:
   * - "Domestic 11.8kg" -> "Domestic"
   * - "Domestic (11.8kg)" -> "Domestic"
   * - "Standard 15kg" -> "Standard"
   * - "Special (10kg)" -> "Special"
   * - "special 10kg" -> "Special" (case-insensitive normalization)
   * 
   * IMPORTANT: Always normalizes to consistent case (capitalize first letter of each word)
   * to ensure "special" and "Special" are treated as the same cylinder type
   */
  private static extractTypeNameFromItemName(itemName: string): string | null {
    if (!itemName) return null;
    
    const name = itemName.trim();
    
    // Extract the text part before the capacity
    // Handles formats:
    // - "Domestic 11.8kg" -> "Domestic"
    // - "Domestic (11.8kg)" -> "Domestic"
    // - "Standard 15 kg" -> "Standard"
    // Pattern: text followed by optional space, optional parentheses, numbers (with optional decimal), and "kg"
    const typeNameMatch = name.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*(?:\(?\d+\.?\d*\s*kg\)?)?/i);
    
    if (typeNameMatch && typeNameMatch[1]) {
      const extractedName = typeNameMatch[1].trim();
      
      // Use shared normalization function to ensure consistent case
      // This ensures "special", "Special", "SPECIAL" all become "Special"
      return normalizeTypeName(extractedName);
    }
    
    // If no match found, return null (will use default display logic)
    return null;
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

