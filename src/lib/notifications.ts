import { prisma } from '@/lib/db';

export interface CreateNotificationData {
  type: 'CYLINDER_ADDED' | 'CYLINDER_UPDATED' | 'CYLINDER_DELETED' | 'CYLINDER_STATUS_CHANGED' |
        'VENDOR_ADDED' | 'VENDOR_UPDATED' | 'VENDOR_DELETED' |
        'CUSTOMER_ADDED' | 'CUSTOMER_UPDATED' | 'CUSTOMER_DELETED' |
        'EXPENSE_ADDED' | 'EXPENSE_UPDATED' | 'EXPENSE_DELETED' |
        'PAYMENT_RECEIVED' | 'PAYMENT_UPDATED' | 'PAYMENT_DELETED' |
        'RENTAL_CREATED' | 'RENTAL_UPDATED' | 'RENTAL_COMPLETED' |
        'LOW_INVENTORY' | 'MAINTENANCE_DUE' | 'SYSTEM_ALERT' | 'USER_ACTIVITY';
  title: string;
  message: string;
  userId?: string; // null for global notifications
  metadata?: Record<string, any>; // Additional data for the notification
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        userId: data.userId || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        priority: data.priority || 'MEDIUM',
      },
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

// Cylinder Operations
export async function createCylinderAddedNotification(cylinderCode: string, userEmail: string, cylinderType: string) {
  return createNotification({
    type: 'CYLINDER_ADDED',
    title: 'New Cylinder Added',
    message: `Cylinder ${cylinderCode} (${cylinderType}) has been added to inventory by ${userEmail}`,
    metadata: { cylinderCode, cylinderType, userEmail },
    priority: 'MEDIUM'
  });
}

export async function createCylinderUpdatedNotification(cylinderCode: string, userEmail: string, changes: string[]) {
  return createNotification({
    type: 'CYLINDER_UPDATED',
    title: 'Cylinder Updated',
    message: `Cylinder ${cylinderCode} has been updated by ${userEmail}. Changes: ${changes.join(', ')}`,
    metadata: { cylinderCode, userEmail, changes },
    priority: 'MEDIUM'
  });
}

export async function createCylinderStatusChangedNotification(cylinderCode: string, oldStatus: string, newStatus: string, userEmail: string) {
  return createNotification({
    type: 'CYLINDER_STATUS_CHANGED',
    title: 'Cylinder Status Changed',
    message: `Cylinder ${cylinderCode} status changed from ${oldStatus} to ${newStatus} by ${userEmail}`,
    metadata: { cylinderCode, oldStatus, newStatus, userEmail },
    priority: 'HIGH'
  });
}

export async function createCylinderDeletedNotification(cylinderCode: string, userEmail: string) {
  return createNotification({
    type: 'CYLINDER_DELETED',
    title: 'Cylinder Deleted',
    message: `Cylinder ${cylinderCode} has been deleted by ${userEmail}`,
    metadata: { cylinderCode, userEmail },
    priority: 'HIGH'
  });
}

// Vendor Operations
export async function createVendorAddedNotification(vendorName: string, userEmail: string, vendorCode: string) {
  return createNotification({
    type: 'VENDOR_ADDED',
    title: 'New Vendor Added',
    message: `Vendor "${vendorName}" (${vendorCode}) has been added by ${userEmail}`,
    metadata: { vendorName, vendorCode, userEmail },
    priority: 'MEDIUM'
  });
}

export async function createVendorUpdatedNotification(vendorName: string, userEmail: string, changes: string[]) {
  return createNotification({
    type: 'VENDOR_UPDATED',
    title: 'Vendor Updated',
    message: `Vendor "${vendorName}" has been updated by ${userEmail}. Changes: ${changes.join(', ')}`,
    metadata: { vendorName, userEmail, changes },
    priority: 'MEDIUM'
  });
}

export async function createVendorDeletedNotification(vendorName: string, userEmail: string) {
  return createNotification({
    type: 'VENDOR_DELETED',
    title: 'Vendor Deleted',
    message: `Vendor "${vendorName}" has been deleted by ${userEmail}`,
    metadata: { vendorName, userEmail },
    priority: 'HIGH'
  });
}

// Customer Operations
export async function createCustomerAddedNotification(customerName: string, userEmail: string, customerCode: string) {
  return createNotification({
    type: 'CUSTOMER_ADDED',
    title: 'New Customer Added',
    message: `Customer "${customerName}" (${customerCode}) has been added by ${userEmail}`,
    metadata: { customerName, customerCode, userEmail },
    priority: 'MEDIUM'
  });
}

export async function createCustomerUpdatedNotification(customerName: string, userEmail: string, changes: string[]) {
  return createNotification({
    type: 'CUSTOMER_UPDATED',
    title: 'Customer Updated',
    message: `Customer "${customerName}" has been updated by ${userEmail}. Changes: ${changes.join(', ')}`,
    metadata: { customerName, userEmail, changes },
    priority: 'MEDIUM'
  });
}

export async function createCustomerDeletedNotification(customerName: string, userEmail: string) {
  return createNotification({
    type: 'CUSTOMER_DELETED',
    title: 'Customer Deleted',
    message: `Customer "${customerName}" has been deleted by ${userEmail}`,
    metadata: { customerName, userEmail },
    priority: 'HIGH'
  });
}

// Expense Operations
export async function createExpenseAddedNotification(amount: number, category: string, userEmail: string, description: string) {
  return createNotification({
    type: 'EXPENSE_ADDED',
    title: 'New Expense Added',
    message: `New ${category} expense of $${amount.toFixed(2)} added by ${userEmail}: ${description}`,
    metadata: { amount, category, userEmail, description },
    priority: 'MEDIUM'
  });
}

export async function createExpenseUpdatedNotification(amount: number, category: string, userEmail: string, changes: string[]) {
  return createNotification({
    type: 'EXPENSE_UPDATED',
    title: 'Expense Updated',
    message: `${category} expense of $${amount.toFixed(2)} has been updated by ${userEmail}. Changes: ${changes.join(', ')}`,
    metadata: { amount, category, userEmail, changes },
    priority: 'MEDIUM'
  });
}

export async function createExpenseDeletedNotification(amount: number, category: string, userEmail: string) {
  return createNotification({
    type: 'EXPENSE_DELETED',
    title: 'Expense Deleted',
    message: `${category} expense of $${amount.toFixed(2)} has been deleted by ${userEmail}`,
    metadata: { amount, category, userEmail },
    priority: 'HIGH'
  });
}

// Payment Operations
export async function createPaymentReceivedNotification(amount: number, customerName: string, paymentMethod: string) {
  return createNotification({
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received',
    message: `Payment of $${amount.toFixed(2)} received from ${customerName} via ${paymentMethod}`,
    metadata: { amount, customerName, paymentMethod },
    priority: 'HIGH'
  });
}

export async function createPaymentUpdatedNotification(amount: number, customerName: string, userEmail: string, changes: string[]) {
  return createNotification({
    type: 'PAYMENT_UPDATED',
    title: 'Payment Updated',
    message: `Payment of $${amount.toFixed(2)} for ${customerName} has been updated by ${userEmail}. Changes: ${changes.join(', ')}`,
    metadata: { amount, customerName, userEmail, changes },
    priority: 'MEDIUM'
  });
}

// Rental Operations
export async function createRentalCreatedNotification(customerName: string, cylinderCode: string, userEmail: string) {
  return createNotification({
    type: 'RENTAL_CREATED',
    title: 'New Rental Created',
    message: `Rental created for ${customerName} with cylinder ${cylinderCode} by ${userEmail}`,
    metadata: { customerName, cylinderCode, userEmail },
    priority: 'MEDIUM'
  });
}

export async function createRentalCompletedNotification(customerName: string, cylinderCode: string, userEmail: string) {
  return createNotification({
    type: 'RENTAL_COMPLETED',
    title: 'Rental Completed',
    message: `Rental completed for ${customerName} with cylinder ${cylinderCode} by ${userEmail}`,
    metadata: { customerName, cylinderCode, userEmail },
    priority: 'MEDIUM'
  });
}

// System Alerts
export async function createLowInventoryNotification(cylinderType: string, count: number) {
  return createNotification({
    type: 'LOW_INVENTORY',
    title: 'Low Inventory Alert',
    message: `${cylinderType} cylinders are running low (${count} remaining). Please restock soon.`,
    metadata: { cylinderType, count },
    priority: 'URGENT'
  });
}

export async function createMaintenanceDueNotification(cylinderCode: string, daysUntilDue: number) {
  return createNotification({
    type: 'MAINTENANCE_DUE',
    title: 'Maintenance Due Soon',
    message: `Cylinder ${cylinderCode} requires maintenance in ${daysUntilDue} days`,
    metadata: { cylinderCode, daysUntilDue },
    priority: daysUntilDue <= 3 ? 'URGENT' : 'HIGH'
  });
}

export async function createSystemAlertNotification(title: string, message: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM') {
  return createNotification({
    type: 'SYSTEM_ALERT',
    title,
    message,
    priority
  });
}

// User Activity Tracking
export async function createUserActivityNotification(userEmail: string, action: string, details: string) {
  return createNotification({
    type: 'USER_ACTIVITY',
    title: 'User Activity',
    message: `${userEmail} performed: ${action} - ${details}`,
    metadata: { userEmail, action, details },
    priority: 'LOW'
  });
}

// Batch notification creation for multiple operations
export async function createBatchNotifications(notifications: CreateNotificationData[]) {
  try {
    const createdNotifications = await Promise.all(
      notifications.map(notification => createNotification(notification))
    );
    return createdNotifications;
  } catch (error) {
    console.error('Failed to create batch notifications:', error);
    throw error;
  }
}

// Get notification statistics
export async function getNotificationStats() {
  try {
    const [total, unread, urgent] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { isRead: false } }),
      prisma.notification.count({ where: { priority: 'URGENT', isRead: false } })
    ]);

    return { total, unread, urgent };
  } catch (error) {
    console.error('Failed to get notification stats:', error);
    throw error;
  }
}
