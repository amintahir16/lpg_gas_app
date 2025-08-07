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