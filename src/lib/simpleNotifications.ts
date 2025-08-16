// Simple notification system that works with existing Prisma setup
export interface SimpleNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId?: string;
}

// In-memory notification storage for now
let notifications: SimpleNotification[] = [];
let nextId = 1;

export async function createSimpleNotification(
  type: string,
  title: string,
  message: string,
  userId?: string
): Promise<SimpleNotification> {
  const notification: SimpleNotification = {
    id: `notif_${nextId++}`,
    type,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
    userId
  };

  notifications.unshift(notification);
  
  // Keep only last 100 notifications
  if (notifications.length > 100) {
    notifications = notifications.slice(0, 100);
  }

  return notification;
}

export async function getSimpleNotifications(
  userId?: string,
  unreadOnly: boolean = false,
  limit: number = 50
): Promise<SimpleNotification[]> {
  let filtered = notifications;
  
  if (userId) {
    filtered = filtered.filter(n => n.userId === userId || n.userId === null);
  }
  
  if (unreadOnly) {
    filtered = filtered.filter(n => !n.isRead);
  }
  
  return filtered.slice(0, limit);
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.isRead = true;
  }
}

export async function markAllNotificationsAsRead(userId?: string): Promise<void> {
  notifications.forEach(notification => {
    if (notification.userId === userId || notification.userId === null) {
      notification.isRead = true;
    }
  });
}

export async function getNotificationStats(): Promise<{
  total: number;
  unread: number;
  urgent: number;
}> {
  const total = notifications.length;
  const unread = notifications.filter(n => !n.isRead).length;
  const urgent = notifications.filter(n => !n.isRead && n.type.includes('URGENT')).length;
  
  return { total, unread, urgent };
}

// Helper functions for common notification types
export async function createCustomerAddedNotification(
  customerName: string,
  userEmail: string,
  customerCode: string
): Promise<SimpleNotification> {
  return createSimpleNotification(
    'CUSTOMER_ADDED',
    'New Customer Added',
    `Customer "${customerName}" (${customerCode}) has been added by ${userEmail}`,
    userEmail
  );
}

export async function createVendorAddedNotification(
  vendorName: string,
  userEmail: string,
  vendorCode: string
): Promise<SimpleNotification> {
  return createSimpleNotification(
    'VENDOR_ADDED',
    'New Vendor Added',
    `Vendor "${vendorName}" (${vendorCode}) has been added by ${userEmail}`,
    userEmail
  );
}

export async function createExpenseAddedNotification(
  amount: number,
  category: string,
  userEmail: string,
  description: string
): Promise<SimpleNotification> {
  return createSimpleNotification(
    'EXPENSE_ADDED',
    'New Expense Added',
    `New ${category} expense of $${amount.toFixed(2)} added by ${userEmail}: ${description}`,
    userEmail
  );
}

export async function createCylinderAddedNotification(
  cylinderCode: string,
  userEmail: string,
  cylinderType: string
): Promise<SimpleNotification> {
  return createSimpleNotification(
    'CYLINDER_ADDED',
    'New Cylinder Added',
    `Cylinder ${cylinderCode} (${cylinderType}) has been added to inventory by ${userEmail}`,
    userEmail
  );
}

export async function createSystemAlertNotification(
  title: string,
  message: string,
  userId?: string
): Promise<SimpleNotification> {
  return createSimpleNotification(
    'SYSTEM_ALERT',
    title,
    message,
    userId
  );
} 