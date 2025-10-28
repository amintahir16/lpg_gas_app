import { prisma } from '@/lib/db';

interface AccessorySaleItem {
  category: string;
  itemType: string;
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
  // Vaporizer-specific fields
  isVaporizer?: boolean;
  usagePrice?: number; // Cost Price - for charging usage (not deducted from inventory)
  sellingPrice?: number; // Selling Price - for selling vaporizer (deducted from inventory)
  costPerPiece?: number;
}

export class InventoryDeductionService {
  /**
   * Deduct sold accessories from inventory
   */
  static async deductAccessoriesFromInventory(items: AccessorySaleItem[]): Promise<void> {
    console.log('🔄 Starting inventory deduction for accessories...');
    
    for (const item of items) {
      if (item.quantity <= 0) continue;
      
      // Special handling for vaporizers
      if (item.isVaporizer) {
        console.log(`🌫️ Processing vaporizer: ${item.category} - ${item.itemType}`);
        console.log(`   Usage Price: ${item.usagePrice || 0}`);
        console.log(`   Selling Price: ${item.sellingPrice || 0}`);
        console.log(`   Quantity: ${item.quantity}`);
        
        // Only deduct from inventory if selling price is set (customer is buying the vaporizer)
        if (!item.sellingPrice || item.sellingPrice <= 0) {
          console.log(`   ⚠️ No selling price set - vaporizer usage only, NOT deducting from inventory`);
          continue;
        }
        
        console.log(`   ✅ Selling price set - deducting vaporizer from inventory`);
      } else {
        console.log(`📦 Deducting ${item.quantity} units of ${item.category} - ${item.itemType}`);
      }
      
      try {
        // Find the inventory item
        const inventoryItem = await prisma.customItem.findFirst({
          where: {
            name: item.category,
            type: item.itemType,
            isActive: true
          }
        });
        
        if (!inventoryItem) {
          console.warn(`⚠️ Inventory item not found: ${item.category} - ${item.itemType}`);
          continue;
        }
        
        // Check if we have enough stock
        if (inventoryItem.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for ${item.category} - ${item.itemType}. ` +
            `Requested: ${item.quantity}, Available: ${inventoryItem.quantity}`
          );
        }
        
        // Deduct the quantity
        const newQuantity = inventoryItem.quantity - item.quantity;
        const newTotalCost = newQuantity * Number(inventoryItem.costPerPiece);
        
        await prisma.customItem.update({
          where: { id: inventoryItem.id },
          data: {
            quantity: newQuantity,
            totalCost: newTotalCost,
            updatedAt: new Date()
          }
        });
        
        if (item.isVaporizer) {
          console.log(`✅ Successfully deducted ${item.quantity} vaporizer units. New stock: ${newQuantity}`);
          console.log(`   Business Impact: Customer bought vaporizer (selling price: ${item.sellingPrice})`);
        } else {
          console.log(`✅ Successfully deducted ${item.quantity} units. New stock: ${newQuantity}`);
        }
        
      } catch (error) {
        console.error(`❌ Error deducting inventory for ${item.category} - ${item.itemType}:`, error);
        throw error;
      }
    }
    
    console.log('✅ Inventory deduction completed successfully');
  }
  
  /**
   * Check if we have sufficient inventory for the requested items
   */
  static async validateInventoryAvailability(items: AccessorySaleItem[]): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    for (const item of items) {
      if (item.quantity <= 0) continue;
      
      const inventoryItem = await prisma.customItem.findFirst({
        where: {
          name: item.category,
          type: item.itemType,
          isActive: true
        }
      });
      
      if (!inventoryItem) {
        errors.push(`Item not found in inventory: ${item.category} - ${item.itemType}`);
        continue;
      }
      
      if (inventoryItem.quantity < item.quantity) {
        errors.push(
          `Insufficient stock for ${item.category} - ${item.itemType}. ` +
          `Requested: ${item.quantity}, Available: ${inventoryItem.quantity}`
        );
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get current inventory levels for accessories
   */
  static async getInventoryLevels(): Promise<Array<{
    category: string;
    itemType: string;
    quantity: number;
    costPerPiece: number;
  }>> {
    const items = await prisma.customItem.findMany({
      where: {
        isActive: true,
        quantity: {
          gt: 0
        }
      },
      select: {
        name: true,
        type: true,
        quantity: true,
        costPerPiece: true
      },
      orderBy: [
        { name: 'asc' },
        { type: 'asc' }
      ]
    });
    
    return items.map(item => ({
      category: item.name,
      itemType: item.type,
      quantity: item.quantity,
      costPerPiece: Number(item.costPerPiece)
    }));
  }
}
