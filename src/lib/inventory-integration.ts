import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateCylinderTypeFromCapacity, normalizeTypeName } from './cylinder-utils';
import { regionScopedWhere } from './region';
import { buildCylinderVariantKey, buildPrismaCylinderVariantWhere } from '@/lib/cylinder-variant-key';

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

export type PrismaTx = Prisma.TransactionClient;

export type InventoryEffectType =
  | 'CYLINDER_STATUS_CHANGE'
  | 'CYLINDER_CREATED'
  | 'CUSTOM_ITEM_UPDATED'
  | 'CUSTOM_ITEM_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_CREATED';

export type InventoryEntityType = 'CYLINDER' | 'CUSTOM_ITEM' | 'PRODUCT';

export interface PurchaseInventoryEffectRecord {
  effectType: InventoryEffectType;
  entityType: InventoryEntityType;
  entityId: string | null;
  itemName: string | null;
  quantity: number;
  beforeState: Prisma.InputJsonValue | null;
  afterState: Prisma.InputJsonValue | null;
}

function getDb(tx?: PrismaTx) {
  return tx ?? prisma;
}

/**
 * Service to integrate vendor purchases with inventory system.
 * When called with a transaction client, all writes participate in that transaction
 * and exact inventory effects are returned for safe undo tracking.
 */
export class InventoryIntegrationService {
  /**
   * Process vendor purchase items and add them to appropriate inventory tables.
   * Returns exact effects when a transaction client is provided.
   */
  static async processPurchaseItems(
    items: VendorPurchaseItem[],
    vendorCategory?: string,
    regionId?: string | null,
    tx?: PrismaTx,
  ): Promise<PurchaseInventoryEffectRecord[]> {
    console.log('🔄 Processing vendor purchase items for inventory integration...');
    console.log(`🏪 Vendor category: ${vendorCategory}, Region: ${regionId || 'NONE'}`);

    const effects: PurchaseInventoryEffectRecord[] = [];

    for (const item of items) {
      try {
        const itemEffects = await this.processItem(item, vendorCategory, regionId, tx);
        effects.push(...itemEffects);
        console.log(`✅ Successfully processed: ${item.itemName} (${item.quantity} units)`);
      } catch (error) {
        console.error(`❌ Failed to process item ${item.itemName}:`, error);
        throw error;
      }
    }

    console.log('✅ All purchase items processed successfully');
    return effects;
  }

  private static async processItem(
    item: VendorPurchaseItem,
    vendorCategory?: string,
    regionId?: string | null,
    tx?: PrismaTx,
  ): Promise<PurchaseInventoryEffectRecord[]> {
    const itemName = item.itemName.toLowerCase();

    console.log(`🔍 Processing item: ${item.itemName} (${itemName})`);
    console.log(`🔍 Vendor category: ${vendorCategory}`);

    if (this.isGasPurchaseVendor(vendorCategory)) {
      console.log(`⛽ Processing as gas purchase (vendor category: ${vendorCategory})`);
      return this.processGasPurchase(item, regionId, tx);
    }

    if (this.isAccessoriesPurchaseVendor(vendorCategory)) {
      console.log(`🔧 Processing as accessories purchase (vendor category: ${vendorCategory})`);
      return this.processAccessoriesPurchase(item, regionId, tx);
    }

    if (this.isVaporizerPurchaseVendor(vendorCategory)) {
      console.log(`⚙️ Processing as vaporizer purchase (vendor category: ${vendorCategory})`);
      return this.processVaporizerPurchase(item, regionId, tx);
    }

    if (this.isValvesPurchaseVendor(vendorCategory)) {
      console.log(`🔧 Processing as valves purchase (vendor category: ${vendorCategory})`);
      return this.processValvesPurchase(item, regionId, tx);
    }

    if (this.isCylinderPurchaseVendor(vendorCategory)) {
      console.log(`📦 Processing as cylinder purchase (vendor category: ${vendorCategory})`);
      return this.processCylinderPurchase(item, regionId, tx);
    }

    console.log(`🔍 Is cylinder item: ${this.isCylinderItem(itemName)}`);
    console.log(`🔍 Is gas item: ${this.isGasItem(itemName)}`);

    if (this.isCylinderItem(itemName)) {
      console.log(`📦 Processing as cylinder purchase (detected from item name)`);
      return this.processCylinderPurchase(item, regionId, tx);
    }

    console.log(`📦 Processing as generic product`);
    return this.processGenericProduct(item, regionId, tx);
  }

  private static isGasPurchaseVendor(categorySlug?: string): boolean {
    if (!categorySlug) return false;
    const normalizedSlug = categorySlug.toLowerCase().replace(/[_-]/g, '');
    const gasPatterns = ['gaspurchase', 'gasfilling', 'gasrefill', 'gasrefilling'];
    return gasPatterns.some((pattern) => normalizedSlug.includes(pattern));
  }

  private static isAccessoriesPurchaseVendor(categorySlug?: string): boolean {
    if (!categorySlug) return false;
    const normalizedSlug = categorySlug.toLowerCase().replace(/[_-]/g, '');
    const accessoriesPatterns = [
      'accessoriespurchase',
      'accessories_purchase',
      'accessorypurchase',
      'accessory_purchase',
    ];
    return accessoriesPatterns.some((pattern) => normalizedSlug.includes(pattern));
  }

  private static isVaporizerPurchaseVendor(categorySlug?: string): boolean {
    if (!categorySlug) return false;
    const normalizedSlug = categorySlug.toLowerCase().replace(/[_-]/g, '');
    const vaporizerPatterns = [
      'vaporizerpurchase',
      'vaporizer_purchase',
      'vaporiserpurchase',
      'vaporiser_purchase',
    ];
    return vaporizerPatterns.some((pattern) => normalizedSlug.includes(pattern));
  }

  private static isValvesPurchaseVendor(categorySlug?: string): boolean {
    if (!categorySlug) return false;
    const normalizedSlug = categorySlug.toLowerCase().replace(/[_-]/g, '');
    const valvesPatterns = [
      'valvespurchase',
      'valves_purchase',
      'valvepurchase',
      'valve_purchase',
    ];
    return valvesPatterns.some((pattern) => normalizedSlug.includes(pattern));
  }

  private static isCylinderPurchaseVendor(categorySlug?: string): boolean {
    if (!categorySlug) return false;
    const normalizedSlug = categorySlug.toLowerCase().replace(/[_-]/g, '');
    const cylinderPurchasePatterns = [
      'cylinderpurchase',
      'cylinderspurchase',
      'cylinder_purchase',
      'cylinders_purchase',
      'cylinderpurchases',
      'cylinderspurchases',
    ];
    return cylinderPurchasePatterns.some((pattern) => normalizedSlug.includes(pattern));
  }

  private static isCylinderItem(itemName: string): boolean {
    const cylinderKeywords = ['cylinder', 'gas cylinder', 'lpg cylinder'];
    const cylinderPatterns = [
      'domestic cylinder',
      'standard cylinder',
      'commercial cylinder',
      '11.8kg cylinder',
      '15kg cylinder',
      '45.4kg cylinder',
      'domestic (11.8kg)',
      'standard (15kg)',
      'commercial (45.4kg)',
    ];
    return (
      cylinderKeywords.some((keyword) => itemName.includes(keyword)) ||
      cylinderPatterns.some((pattern) => itemName.includes(pattern))
    );
  }

  private static isGasItem(itemName: string): boolean {
    const gasKeywords = [
      'gas',
      'domestic gas',
      'standard gas',
      'commercial gas',
      '11.8kg gas',
      '15kg gas',
      '45.4kg gas',
      'domestic (11.8kg) gas',
      'standard (15kg) gas',
      'commercial (45.4kg) gas',
    ];
    return gasKeywords.some((keyword) => itemName.toLowerCase().includes(keyword));
  }

  private static async processGasPurchase(
    item: VendorPurchaseItem,
    regionId?: string | null,
    tx?: PrismaTx,
  ): Promise<PurchaseInventoryEffectRecord[]> {
    const db = getDb(tx);
    const { itemName, quantity: rawQuantity } = item;
    const quantity = Number(rawQuantity);
    const effects: PurchaseInventoryEffectRecord[] = [];

    console.log(`🔄 Processing gas purchase: ${itemName} (${quantity} units)`);

    if (quantity <= 0) {
      console.log(`⚠️ Invalid quantity for gas purchase: ${itemName}`);
      return effects;
    }

    const name = itemName.toLowerCase();
    const weightMatch = name.match(/(\d+\.?\d*)\s*kg/i);

    if (!weightMatch) {
      console.log(`⚠️ Could not extract capacity from gas type: ${itemName}`);
      return effects;
    }

    const capacity = parseFloat(weightMatch[1]);
    if (isNaN(capacity) || capacity <= 0) {
      console.log(`⚠️ Invalid capacity extracted from gas type: ${itemName} (capacity: ${capacity})`);
      return effects;
    }

    const m = itemName.match(/^\s*([^\d(]+?)\s*(?:\(|\b)\s*(\d+(?:\.\d+)?)\s*kg/i);
    const rawTypeName = m?.[1]?.trim() || '';
    const normalizedTypeName = normalizeTypeName(rawTypeName);
    const typeNameForKey =
      normalizedTypeName && !/cylinder|gas/i.test(normalizedTypeName) ? normalizedTypeName : null;

    const generatedType = generateCylinderTypeFromCapacity(capacity);
    const candidates: string[] = [];
    if (Math.abs(capacity - 11.8) < 0.11 || name.includes('domestic')) {
      candidates.push('DOMESTIC_11_8KG', generatedType);
    } else if (Math.abs(capacity - 15) < 0.11 || name.includes('standard')) {
      candidates.push('STANDARD_15KG', generatedType);
    } else if (Math.abs(capacity - 45.4) < 0.11 || name.includes('commercial')) {
      candidates.push('COMMERCIAL_45_4KG', generatedType);
    } else {
      candidates.push(generatedType);
    }

    const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
    const variantKeys = uniqueCandidates.map((ct) =>
      buildCylinderVariantKey({
        cylinderType: ct,
        typeName: typeNameForKey,
        capacity,
      }),
    );

    console.log(
      `🔍 Looking for ${quantity} empty cylinders for variant: ${typeNameForKey || 'Cylinder'} (${capacity}kg) in [${uniqueCandidates.join(', ')}]`,
    );

    const emptyCylinders = await db.cylinder.findMany({
      where: {
        currentStatus: 'EMPTY',
        ...regionScopedWhere(regionId),
        OR: uniqueCandidates.map((ct, idx) => ({
          ...buildPrismaCylinderVariantWhere(ct, variantKeys[idx]),
        })),
      },
      take: quantity,
      orderBy: { createdAt: 'asc' },
    });

    if (emptyCylinders.length < quantity) {
      const errorMessage = `Not enough empty cylinders available for ${typeNameForKey || 'Cylinder'} (${capacity}kg). Found: ${emptyCylinders.length}, Needed: ${quantity}`;
      console.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }

    for (const cylinder of emptyCylinders) {
      const updated = await db.cylinder.update({
        where: { id: cylinder.id },
        data: { currentStatus: 'FULL' },
      });

      effects.push({
        effectType: 'CYLINDER_STATUS_CHANGE',
        entityType: 'CYLINDER',
        entityId: cylinder.id,
        itemName,
        quantity: 1,
        beforeState: {
          id: cylinder.id,
          code: cylinder.code,
          currentStatus: cylinder.currentStatus,
          location: cylinder.location,
          storeId: cylinder.storeId,
          vehicleId: cylinder.vehicleId,
        },
        afterState: {
          id: updated.id,
          code: updated.code,
          currentStatus: updated.currentStatus,
          location: updated.location,
          storeId: updated.storeId,
          vehicleId: updated.vehicleId,
        },
      });
    }

    console.log(`✅ Updated ${emptyCylinders.length} cylinder(s) to FULL for gas purchase: ${itemName}`);
    return effects;
  }

  private static async processAccessoriesPurchase(
    item: VendorPurchaseItem,
    regionId?: string | null,
    tx?: PrismaTx,
  ): Promise<PurchaseInventoryEffectRecord[]> {
    const category = item.category || this.determineAccessoryCategory(item.itemName);
    return this.processCustomItemPurchase(item, category, regionId, tx);
  }

  private static async processVaporizerPurchase(
    item: VendorPurchaseItem,
    regionId?: string | null,
    tx?: PrismaTx,
  ): Promise<PurchaseInventoryEffectRecord[]> {
    const category = item.category || this.determineVaporizerCategory(item.itemName);
    return this.processCustomItemPurchase(item, category, regionId, tx);
  }

  private static async processValvesPurchase(
    item: VendorPurchaseItem,
    regionId?: string | null,
    tx?: PrismaTx,
  ): Promise<PurchaseInventoryEffectRecord[]> {
    const category = item.category || 'Valves';
    const normalizedCategory = this.normalizeCategoryName(category);
    return this.processCustomItemPurchase(item, normalizedCategory, regionId, tx);
  }

  private static async processCustomItemPurchase(
    item: VendorPurchaseItem,
    category: string,
    regionId?: string | null,
    tx?: PrismaTx,
  ): Promise<PurchaseInventoryEffectRecord[]> {
    const db = getDb(tx);
    const itemName = item.itemName;
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const totalCost = quantity * unitPrice;
    const normalizedCategory = this.normalizeCategoryName(category);

    console.log(
      `🔧 Processing custom item purchase: ${itemName} in ${normalizedCategory} (${quantity} units at ${unitPrice} each)`,
    );

    const existingItem = await db.customItem.findFirst({
      where: {
        name: {
          equals: normalizedCategory,
          mode: 'insensitive',
        },
        type: itemName,
        isActive: true,
        ...regionScopedWhere(regionId),
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      const newTotalCost = newQuantity * unitPrice;

      const updated = await db.customItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          costPerPiece: unitPrice,
          totalCost: newTotalCost,
        },
      });

      console.log(
        `✅ Updated existing custom item: ${itemName} in ${normalizedCategory} (${existingItem.quantity} → ${newQuantity} units)`,
      );

      return [
        {
          effectType: 'CUSTOM_ITEM_UPDATED',
          entityType: 'CUSTOM_ITEM',
          entityId: existingItem.id,
          itemName,
          quantity,
          beforeState: {
            id: existingItem.id,
            name: existingItem.name,
            type: existingItem.type,
            quantity: existingItem.quantity,
            costPerPiece: Number(existingItem.costPerPiece),
            totalCost: Number(existingItem.totalCost),
            isActive: existingItem.isActive,
          },
          afterState: {
            id: updated.id,
            name: updated.name,
            type: updated.type,
            quantity: updated.quantity,
            costPerPiece: Number(updated.costPerPiece),
            totalCost: Number(updated.totalCost),
            isActive: updated.isActive,
          },
        },
      ];
    }

    const created = await db.customItem.create({
      data: {
        name: normalizedCategory,
        type: itemName,
        quantity,
        costPerPiece: unitPrice,
        totalCost,
        ...(regionId ? { regionId } : {}),
      },
    });

    console.log(`✅ Created new custom item: ${itemName} in ${normalizedCategory} (${quantity} units)`);

    return [
      {
        effectType: 'CUSTOM_ITEM_CREATED',
        entityType: 'CUSTOM_ITEM',
        entityId: created.id,
        itemName,
        quantity,
        beforeState: null,
        afterState: {
          id: created.id,
          name: created.name,
          type: created.type,
          quantity: created.quantity,
          costPerPiece: Number(created.costPerPiece),
          totalCost: Number(created.totalCost),
          isActive: created.isActive,
        },
      },
    ];
  }

  private static normalizeCategoryName(category: string): string {
    const normalized = category.toLowerCase().trim();

    if (normalized === 'stove' || normalized === 'stoves') {
      return 'Stoves';
    }
    if (normalized === 'regulator' || normalized === 'regulators') {
      return 'Regulators';
    }
    if (normalized === 'valve' || normalized === 'valves') {
      return 'Valves';
    }
    if (
      normalized === 'pipe' ||
      normalized === 'pipes' ||
      normalized === 'gas pipe' ||
      normalized === 'gas pipes'
    ) {
      return 'Gas Pipes';
    }
    if (
      normalized === 'vaporizer' ||
      normalized === 'vaporizers' ||
      normalized === 'vaporiser' ||
      normalized === 'vaporisers'
    ) {
      return 'Vaporizers';
    }
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }

  private static determineAccessoryCategory(itemName: string): string {
    const name = itemName.toLowerCase();
    if (name.includes('valve')) return 'Valves';
    if (name.includes('regulator')) return 'Regulators';
    if (name.includes('stove') || name.includes('burner')) return 'Stoves';
    if (name.includes('pipe') || name.includes('hose')) return 'Gas Pipes';
    return 'Accessories';
  }

  private static determineVaporizerCategory(itemName: string): string {
    return 'Vaporizers';
  }

  private static async processCylinderPurchase(
    item: VendorPurchaseItem,
    regionId?: string | null,
    tx?: PrismaTx,
  ): Promise<PurchaseInventoryEffectRecord[]> {
    const db = getDb(tx);
    const { itemName, quantity: rawQuantity, unitPrice: rawUnitPrice, cylinderCodes, status } = item;
    const quantity = Number(rawQuantity);
    const unitPrice = Number(rawUnitPrice);
    const effects: PurchaseInventoryEffectRecord[] = [];

    const cylinderType = this.extractCylinderType(itemName);
    const typeName = this.extractTypeNameFromItemName(itemName);
    const extractedCapacity = this.extractCapacityFromItemName(itemName);
    const capacity =
      extractedCapacity !== null ? extractedCapacity : this.getCylinderCapacity(cylinderType);
    const cylinderStatus = status || 'EMPTY';
    const codes = cylinderCodes ? cylinderCodes.split(',').map((c) => c.trim()) : [];

    for (let i = 0; i < quantity; i++) {
      let cylinderCode: string;
      if (codes[i] && codes[i].trim()) {
        cylinderCode = codes[i].trim();
      } else {
        const codeInput = typeName || cylinderType;
        const isTypeName = !!typeName;
        const { generateUniqueCylinderCode } = await import('@/lib/cylinder-code-generator');
        cylinderCode = await generateUniqueCylinderCode(codeInput, isTypeName);
      }

      const created = await db.cylinder.create({
        data: {
          code: cylinderCode,
          cylinderType,
          typeName: typeName || null,
          capacity,
          currentStatus: cylinderStatus as any,
          location: 'Store',
          purchaseDate: new Date(),
          purchasePrice: unitPrice,
          ...(regionId ? { regionId } : {}),
        },
      });

      effects.push({
        effectType: 'CYLINDER_CREATED',
        entityType: 'CYLINDER',
        entityId: created.id,
        itemName,
        quantity: 1,
        beforeState: null,
        afterState: {
          id: created.id,
          code: created.code,
          cylinderType: created.cylinderType,
          typeName: created.typeName,
          capacity: Number(created.capacity),
          currentStatus: created.currentStatus,
          location: created.location,
          storeId: created.storeId,
          vehicleId: created.vehicleId,
          purchasePrice: created.purchasePrice != null ? Number(created.purchasePrice) : null,
        },
      });
    }

    console.log(
      `📦 Created ${quantity} ${cylinderType} cylinders with typeName: ${typeName || 'null'}, capacity: ${capacity}kg, status: ${cylinderStatus}`,
    );
    return effects;
  }

  private static async processGenericProduct(
    item: VendorPurchaseItem,
    regionId?: string | null,
    tx?: PrismaTx,
  ): Promise<PurchaseInventoryEffectRecord[]> {
    const db = getDb(tx);
    const { itemName, quantity: rawQuantity, unitPrice: rawUnitPrice } = item;
    const quantity = Number(rawQuantity);
    const unitPrice = Number(rawUnitPrice);

    const existingProduct = await db.product.findFirst({
      where: {
        name: {
          contains: itemName,
          mode: 'insensitive',
        },
        ...regionScopedWhere(regionId),
      },
    });

    if (existingProduct) {
      const updated = await db.product.update({
        where: { id: existingProduct.id },
        data: {
          stockQuantity: { increment: quantity },
        },
      });

      console.log(`📦 Updated product: ${existingProduct.name} (+${quantity} units)`);

      return [
        {
          effectType: 'PRODUCT_UPDATED',
          entityType: 'PRODUCT',
          entityId: existingProduct.id,
          itemName,
          quantity,
          beforeState: {
            id: existingProduct.id,
            name: existingProduct.name,
            stockQuantity: Number(existingProduct.stockQuantity),
            isActive: existingProduct.isActive,
          },
          afterState: {
            id: updated.id,
            name: updated.name,
            stockQuantity: Number(updated.stockQuantity),
            isActive: updated.isActive,
          },
        },
      ];
    }

    const created = await db.product.create({
      data: {
        name: itemName,
        category: 'ACCESSORY',
        unit: 'piece',
        stockQuantity: quantity,
        stockType: 'FILLED',
        priceSoldToCustomer: unitPrice * 1.2,
        lowStockThreshold: 10,
        isActive: true,
        ...(regionId ? { regionId } : {}),
      },
    });

    console.log(`📦 Created new product: ${itemName} (${quantity} units)`);

    return [
      {
        effectType: 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: created.id,
        itemName,
        quantity,
        beforeState: null,
        afterState: {
          id: created.id,
          name: created.name,
          stockQuantity: Number(created.stockQuantity),
          isActive: created.isActive,
        },
      },
    ];
  }

  private static extractCylinderType(itemName: string): string {
    const name = itemName.toLowerCase();
    const weightMatch = name.match(/(\d+\.?\d*)\s*kg/i);

    if (weightMatch) {
      const capacity = parseFloat(weightMatch[1]);
      if (!isNaN(capacity) && capacity > 0) {
        return generateCylinderTypeFromCapacity(capacity);
      }
    }

    console.log(`⚠️ Could not extract capacity from item name: ${itemName}, using default`);
    return 'STANDARD_15KG';
  }

  private static extractCapacityFromItemName(itemName: string): number | null {
    if (!itemName) return null;
    const name = itemName.trim();
    const capacityMatch = name.match(/(?:\(?)(\d+\.?\d*)\s*kg\)?/i);

    if (capacityMatch && capacityMatch[1]) {
      const capacity = parseFloat(capacityMatch[1]);
      if (!isNaN(capacity) && capacity > 0.1 && capacity <= 1000) {
        return capacity;
      }
    }
    return null;
  }

  private static extractTypeNameFromItemName(itemName: string): string | null {
    if (!itemName) return null;
    const name = itemName.trim();
    const typeNameMatch = name.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*(?:\(?\d+\.?\d*\s*kg\)?)?/i);

    if (typeNameMatch && typeNameMatch[1]) {
      return normalizeTypeName(typeNameMatch[1].trim());
    }
    return null;
  }

  private static getCylinderCapacity(type: string): number {
    const weightMatch = type.match(/(\d+\.?\d*)/);
    if (weightMatch) {
      return parseFloat(weightMatch[1]);
    }

    switch (type) {
      case 'DOMESTIC_11_8KG':
        return 11.8;
      case 'STANDARD_15KG':
        return 15.0;
      case 'COMMERCIAL_45_4KG':
        return 45.4;
      case 'CYLINDER_6KG':
        return 6.0;
      case 'CYLINDER_30KG':
        return 30.0;
      default:
        return 15.0;
    }
  }
}
