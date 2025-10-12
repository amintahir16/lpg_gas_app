import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function generateCustomerCode(): string {
  return `CUST${Date.now().toString().slice(-6)}`
}

export function generateCylinderCode(): string {
  return `CYL${Date.now().toString().slice(-6)}`
}

export function generateInvoiceNumber(): string {
  return `INV${Date.now().toString().slice(-8)}`
}

export function generateVendorCode(): string {
  return `VEND${Date.now().toString().slice(-6)}`
}

export function generateCylinderCodes(itemName: string, quantity: number, startNumber: number = 1): string[] {
  // Generate prefix based on cylinder type
  let prefix = 'C';
  if (itemName.includes('Domestic') || itemName.includes('11.8kg')) {
    prefix = 'D';
  } else if (itemName.includes('Standard') || itemName.includes('15kg')) {
    prefix = 'S';
  } else if (itemName.includes('Commercial') || itemName.includes('45.4kg')) {
    prefix = 'C';
  }

  const codes = [];
  for (let i = 0; i < quantity; i++) {
    const codeNumber = (startNumber + i).toString().padStart(2, '0');
    codes.push(`${prefix}${codeNumber}`);
  }

  return codes;
} 