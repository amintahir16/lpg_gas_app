import { prisma } from '@/lib/db';

export interface CreateNotificationData {
  type: 'CYLINDER_ADDED' | 'VENDOR_ADDED' | 'EXPENSE_ADDED' | 'PAYMENT_RECEIVED' | 'LOW_INVENTORY' | 'RENTAL_REQUEST' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  userId?: string; // null for global notifications
}

export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        userId: data.userId || null,
      },
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

export async function createCylinderAddedNotification(cylinderCode: string, userEmail: string) {
  return createNotification({
    type: 'CYLINDER_ADDED',
    title: 'New Cylinder Added',
    message: `Cylinder ${cylinderCode} has been added to inventory by ${userEmail}`,
  });
}

export async function createVendorAddedNotification(vendorName: string, userEmail: string) {
  return createNotification({
    type: 'VENDOR_ADDED',
    title: 'New Vendor Added',
    message: `Vendor "${vendorName}" has been added by ${userEmail}`,
  });
}

export async function createExpenseAddedNotification(amount: number, category: string, userEmail: string) {
  return createNotification({
    type: 'EXPENSE_ADDED',
    title: 'New Expense Added',
    message: `New ${category} expense of $${amount.toFixed(2)} added by ${userEmail}`,
  });
}

export async function createLowInventoryNotification(cylinderType: string, count: number) {
  return createNotification({
    type: 'LOW_INVENTORY',
    title: 'Low Inventory Alert',
    message: `${cylinderType} cylinders are running low (${count} remaining)`,
  });
}

export async function createPaymentReceivedNotification(amount: number, customerName: string) {
  return createNotification({
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received',
    message: `Payment of $${amount.toFixed(2)} received from ${customerName}`,
  });
}
