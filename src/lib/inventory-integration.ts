import { prisma } from '@/lib/db';

export interface VendorPurchaseItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cylinderCodes?: string;
}

/**
 * Service to integrate vendor purchases with inventory system
 */
export class InventoryIntegrationService {
  
  /**
   * Process vendor purchase items and add them to appropriate inventory tables
   */
  static async processPurchaseItems(items: VendorPurchaseItem[]): Promise<void> {
    console.log('🔄 Processing vendor purchase items for inventory integration...');
    
    for (const item of items) {
      try {
        await this.processItem(item);
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
  private static async processItem(item: VendorPurchaseItem): Promise<void> {
    const itemName = item.itemName.toLowerCase();
    const quantity = item.quantity;
    const unitPrice = item.unitPrice;

    // Determine item type and route to appropriate handler
    if (this.isCylinderItem(itemName)) {
      await this.processCylinderPurchase(item);
    } else if (this.isRegulatorItem(itemName)) {
      await this.processRegulatorPurchase(item);
    } else if (this.isStoveItem(itemName)) {
      await this.processStovePurchase(item);
    } else if (this.isGasPipeItem(itemName)) {
      await this.processGasPipePurchase(item);
    } else {
      // Generic product - add to Product table
      await this.processGenericProduct(item);
    }
  }

  /**
   * Check if item is a cylinder
   */
  private static isCylinderItem(itemName: string): boolean {
    const cylinderKeywords = [
      'cylinder', 'gas cylinder', 'lpg cylinder', 
      'domestic', 'standard', 'commercial', '11.8kg', '15kg', '45.4kg'
    ];
    return cylinderKeywords.some(keyword => itemName.includes(keyword));
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
   * Process cylinder purchases - create individual cylinder records
   */
  private static async processCylinderPurchase(item: VendorPurchaseItem): Promise<void> {
    const { itemName, quantity: rawQuantity, unitPrice: rawUnitPrice, cylinderCodes } = item;
    const quantity = Number(rawQuantity);
    const unitPrice = Number(rawUnitPrice);
    
    // Extract cylinder type from item name
    const cylinderType = this.extractCylinderType(itemName);
    
    // If cylinder codes are provided, use them; otherwise generate
    const codes = cylinderCodes ? cylinderCodes.split(',').map(c => c.trim()) : [];
    
    // Create individual cylinder records
    for (let i = 0; i < quantity; i++) {
      let cylinderCode: string;
      
      if (codes[i]) {
        cylinderCode = codes[i];
      } else {
        // Generate unique code with timestamp and random component to avoid conflicts
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        cylinderCode = `CYL-${timestamp}-${String(i + 1).padStart(3, '0')}-${random}`;
      }
      
      await prisma.cylinder.create({
        data: {
          code: cylinderCode,
          cylinderType,
          capacity: this.getCylinderCapacity(cylinderType),
          currentStatus: 'FULL',
          location: 'Store',
          purchaseDate: new Date(),
          purchasePrice: unitPrice
        }
      });
    }
    
    console.log(`📦 Created ${quantity} ${cylinderType} cylinders`);
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
