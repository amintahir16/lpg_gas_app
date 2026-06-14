import type { LucideIcon } from 'lucide-react';
import { Home, Building2, Factory, Flame, Package, Truck } from 'lucide-react';

export type ShopIconKey = 'HOME' | 'BUILDING' | 'FACTORY' | 'FLAME' | 'PACKAGE' | 'TRUCK';

export const SHOP_ICON_COMPONENTS: Record<ShopIconKey, LucideIcon> = {
  HOME: Home,
  BUILDING: Building2,
  FACTORY: Factory,
  FLAME: Flame,
  PACKAGE: Package,
  TRUCK: Truck,
};

export function getShopIconComponent(icon: string): LucideIcon {
  return SHOP_ICON_COMPONENTS[icon as ShopIconKey] ?? Package;
}

export interface PublicShopProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  sizeLabel: string | null;
  deliveryTimeNote: string | null;
  icon: ShopIconKey;
  accentColor: string;
  inStock: boolean;
}
