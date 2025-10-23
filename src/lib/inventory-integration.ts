import { prisma } from '@/lib/db';

export interface VendorPurchaseItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cylinderCodes?: string;
  status?: string;
  selectedCylinderIds?: string[];
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

    // For non-gas vendors, use item name detection
    console.log(`🔍 Is cylinder item: ${this.isCylinderItem(itemName)}`);
    console.log(`🔍 Is gas item: ${this.isGasItem(itemName)}`);

    if (this.isCylinderItem(itemName)) {
      console.log(`📦 Processing as cylinder purchase`);
      await this.processCylinderPurchase(item);
    } else if (this.isRegulatorItem(itemName)) {
      console.log(`🔧 Processing as regulator purchase`);
      await this.processRegulatorPurchase(item);
    } else if (this.isStoveItem(itemName)) {
      console.log(`🔥 Processing as stove purchase`);
      await this.processStovePurchase(item);
    } else if (this.isGasPipeItem(itemName)) {
      console.log(`🔗 Processing as gas pipe purchase`);
      await this.processGasPipePurchase(item);
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
   * Check if item is a regulator
   */
  private static isRegulatorItem(itemName: string): boolean {
    const regulatorKeywords = [
      'regulator', 'adjustable', 'pressure', 'high pressure', 
      'low pressure', 'star', 'ideal', '5 star', '3 star'
    ];
    return regulatorKeywords.some(keyword => itemName.includes(keyword));
  }

  /**
   * Check if item is a stove
   */
  private static isStoveItem(itemName: string): boolean {
    const stoveKeywords = [
      'stove', 'burner', 'gas stove', 'cooking', 'premium', 
      'standard', 'economy', 'commercial'
    ];
    return stoveKeywords.some(keyword => itemName.includes(keyword));
  }

  /**
   * Check if item is a gas pipe
   */
  private static isGasPipeItem(itemName: string): boolean {
    const pipeKeywords = [
      'pipe', 'hose', 'rubber', 'steel pipe', 'gas pipe', 
      'mm', 'inch', 'connection'
    ];
    return pipeKeywords.some(keyword => itemName.includes(keyword));
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
   * Process gas purchases - update selected cylinders to FULL status
   */
  private static async processGasPurchase(item: VendorPurchaseItem): Promise<void> {
    const { itemName, selectedCylinderIds } = item;
    
    console.log(`🔄 Processing gas purchase: ${itemName}`);
    console.log(`📋 Selected cylinder IDs:`, selectedCylinderIds);
    
    if (!selectedCylinderIds || selectedCylinderIds.length === 0) {
      console.log(`⚠️ No cylinders selected for gas purchase: ${itemName}`);
      return;
    }

    // Update selected cylinders to FULL status
    const updateResult = await prisma.cylinder.updateMany({
      where: {
        id: {
          in: selectedCylinderIds
        }
      },
      data: {
        currentStatus: 'FULL'
      }
    });

    console.log(`⛽ Updated ${updateResult.count} cylinders to FULL status for gas purchase: ${itemName}`);
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
   * Process regulator purchases - update existing or create new regulator
   */
  private static async processRegulatorPurchase(item: VendorPurchaseItem): Promise<void> {
    const { itemName, quantity: rawQuantity, unitPrice: rawUnitPrice } = item;
    const quantity = Number(rawQuantity);
    const unitPrice = Number(rawUnitPrice);
    
    // Find existing regulator or create new one
    const existingRegulator = await prisma.regulator.findFirst({
      where: {
        type: {
          contains: this.extractRegulatorType(itemName),
          mode: 'insensitive'
        }
      }
    });
    
    const totalCost = quantity * unitPrice;
    
    if (existingRegulator) {
      // Update existing regulator
      await prisma.regulator.update({
        where: { id: existingRegulator.id },
        data: {
          quantity: { increment: quantity },
          totalCost: { increment: totalCost }
        }
      });
      console.log(`🔧 Updated regulator: ${existingRegulator.type} (+${quantity} units)`);
    } else {
      // Create new regulator
      await prisma.regulator.create({
        data: {
          type: this.extractRegulatorType(itemName),
          quantity,
          costPerPiece: unitPrice,
          totalCost
        }
      });
      console.log(`🔧 Created new regulator: ${this.extractRegulatorType(itemName)} (${quantity} units)`);
    }
  }

  /**
   * Process stove purchases - update existing or create new stove
   */
  private static async processStovePurchase(item: VendorPurchaseItem): Promise<void> {
    const { itemName, quantity: rawQuantity, unitPrice: rawUnitPrice } = item;
    const quantity = Number(rawQuantity);
    const unitPrice = Number(rawUnitPrice);
    
    // Find existing stove or create new one
    const existingStove = await prisma.stove.findFirst({
      where: {
        quality: {
          contains: this.extractStoveQuality(itemName),
          mode: 'insensitive'
        }
      }
    });
    
    const totalCost = quantity * unitPrice;
    
    if (existingStove) {
      // Update existing stove
      await prisma.stove.update({
        where: { id: existingStove.id },
        data: {
          quantity: { increment: quantity },
          totalCost: { increment: totalCost }
        }
      });
      console.log(`🔥 Updated stove: ${existingStove.quality} (+${quantity} units)`);
    } else {
      // Create new stove
      await prisma.stove.create({
        data: {
          quality: this.extractStoveQuality(itemName),
          quantity,
          costPerPiece: unitPrice,
          totalCost
        }
      });
      console.log(`🔥 Created new stove: ${this.extractStoveQuality(itemName)} (${quantity} units)`);
    }
  }

  /**
   * Process gas pipe purchases - update existing or create new pipe
   */
  private static async processGasPipePurchase(item: VendorPurchaseItem): Promise<void> {
    const { itemName, quantity: rawQuantity, unitPrice: rawUnitPrice } = item;
    const quantity = Number(rawQuantity);
    const unitPrice = Number(rawUnitPrice);
    
    // Find existing gas pipe or create new one
    const existingPipe = await prisma.gasPipe.findFirst({
      where: {
        type: {
          contains: this.extractGasPipeType(itemName),
          mode: 'insensitive'
        }
      }
    });
    
    const totalCost = quantity * unitPrice;
    
    if (existingPipe) {
      // Update existing gas pipe
      await prisma.gasPipe.update({
        where: { id: existingPipe.id },
        data: {
          quantity: { increment: quantity },
          totalCost: { increment: totalCost }
        }
      });
      console.log(`🔗 Updated gas pipe: ${existingPipe.type} (+${quantity} meters)`);
    } else {
      // Create new gas pipe
      await prisma.gasPipe.create({
        data: {
          type: this.extractGasPipeType(itemName),
          quantity,
          totalCost
        }
      });
      console.log(`🔗 Created new gas pipe: ${this.extractGasPipeType(itemName)} (${quantity} meters)`);
    }
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
   * Extract cylinder type from item name
   */
  private static extractCylinderType(itemName: string): 'DOMESTIC_11_8KG' | 'STANDARD_15KG' | 'COMMERCIAL_45_4KG' {
    if (itemName.includes('11.8') || itemName.includes('domestic')) {
      return 'DOMESTIC_11_8KG';
    } else if (itemName.includes('45.4') || itemName.includes('commercial')) {
      return 'COMMERCIAL_45_4KG';
    } else {
      return 'STANDARD_15KG'; // Default to 15kg
    }
  }

  /**
   * Get cylinder capacity based on type
   */
  private static getCylinderCapacity(type: string): number {
    switch (type) {
      case 'DOMESTIC_11_8KG': return 11.8;
      case 'STANDARD_15KG': return 15.0;
      case 'COMMERCIAL_45_4KG': return 45.4;
      default: return 15.0;
    }
  }

  /**
   * Extract regulator type from item name
   */
  private static extractRegulatorType(itemName: string): string {
    // Extract the main regulator type
    if (itemName.includes('adjustable')) return 'Adjustable';
    if (itemName.includes('ideal')) return 'Ideal High Pressure';
    if (itemName.includes('5 star')) return '5 Star High Pressure';
    if (itemName.includes('3 star')) return '3 Star Low Pressure';
    if (itemName.includes('high pressure')) return 'High Pressure';
    if (itemName.includes('low pressure')) return 'Low Pressure';
    return 'Standard Regulator';
  }

  /**
   * Extract stove quality from item name
   */
  private static extractStoveQuality(itemName: string): string {
    if (itemName.includes('premium')) return 'Premium 4-Burner';
    if (itemName.includes('standard')) return 'Standard 2-Burner';
    if (itemName.includes('economy')) return 'Economy 1-Burner';
    if (itemName.includes('commercial')) return 'Commercial 6-Burner';
    if (itemName.includes('4-burner')) return 'Premium 4-Burner';
    if (itemName.includes('2-burner')) return 'Standard 2-Burner';
    if (itemName.includes('1-burner')) return 'Economy 1-Burner';
    if (itemName.includes('6-burner')) return 'Commercial 6-Burner';
    return 'Standard 2-Burner';
  }

  /**
   * Extract gas pipe type from item name
   */
  private static extractGasPipeType(itemName: string): string {
    if (itemName.includes('rubber') && itemName.includes('6mm')) return 'Rubber Hose 6mm';
    if (itemName.includes('rubber') && itemName.includes('8mm')) return 'Rubber Hose 8mm';
    if (itemName.includes('steel') && itemName.includes('1/2')) return 'Steel Pipe 1/2 inch';
    if (itemName.includes('steel') && itemName.includes('3/4')) return 'Steel Pipe 3/4 inch';
    if (itemName.includes('rubber')) return 'Rubber Hose';
    if (itemName.includes('steel')) return 'Steel Pipe';
    return 'Gas Pipe';
  }
}
