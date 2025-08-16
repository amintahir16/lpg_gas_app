import { createNotification } from './notifications';

// Notification Integration Service
// This service provides easy-to-use functions for creating notifications
// throughout the application without needing to import the full context

export class NotificationIntegrationService {
  private static instance: NotificationIntegrationService;

  private constructor() {}

  public static getInstance(): NotificationIntegrationService {
    if (!NotificationIntegrationService.instance) {
      NotificationIntegrationService.instance = new NotificationIntegrationService();
    }
    return NotificationIntegrationService.instance;
  }

  // Business Operation Notifications

  // Customer Operations
  async notifyCustomerCreated(customerName: string, customerCode: string, userEmail: string) {
    return createNotification({
      type: 'CUSTOMER_ADDED',
      title: 'New Customer Added',
      message: `Customer "${customerName}" (${customerCode}) has been successfully added to the system.`,
      metadata: { customerName, customerCode, userEmail, operation: 'CREATE' },
      priority: 'MEDIUM'
    });
  }

  async notifyCustomerUpdated(customerName: string, customerCode: string, userEmail: string, changes: string[]) {
    return createNotification({
      type: 'CUSTOMER_UPDATED',
      title: 'Customer Updated',
      message: `Customer "${customerName}" (${customerCode}) has been updated. Changes: ${changes.join(', ')}`,
      metadata: { customerName, customerCode, userEmail, changes, operation: 'UPDATE' },
      priority: 'MEDIUM'
    });
  }

  async notifyCustomerDeleted(customerName: string, customerCode: string, userEmail: string) {
    return createNotification({
      type: 'CUSTOMER_DELETED',
      title: 'Customer Removed',
      message: `Customer "${customerName}" (${customerCode}) has been removed from the system.`,
      metadata: { customerName, customerCode, userEmail, operation: 'DELETE' },
      priority: 'HIGH'
    });
  }

  // Vendor Operations
  async notifyVendorCreated(vendorName: string, vendorCode: string, userEmail: string) {
    return createNotification({
      type: 'VENDOR_ADDED',
      title: 'New Vendor Added',
      message: `Vendor "${vendorName}" (${vendorCode}) has been successfully added to the system.`,
      metadata: { vendorName, vendorCode, userEmail, operation: 'CREATE' },
      priority: 'MEDIUM'
    });
  }

  async notifyVendorUpdated(vendorName: string, vendorCode: string, userEmail: string, changes: string[]) {
    return createNotification({
      type: 'VENDOR_UPDATED',
      title: 'Vendor Updated',
      message: `Vendor "${vendorName}" (${vendorCode}) has been updated. Changes: ${changes.join(', ')}`,
      metadata: { vendorName, vendorCode, userEmail, changes, operation: 'UPDATE' },
      priority: 'MEDIUM'
    });
  }

  async notifyVendorDeleted(vendorName: string, vendorCode: string, userEmail: string) {
    return createNotification({
      type: 'VENDOR_DELETED',
      title: 'Vendor Removed',
      message: `Vendor "${vendorName}" (${vendorCode}) has been removed from the system.`,
      metadata: { vendorName, vendorCode, userEmail, operation: 'DELETE' },
      priority: 'HIGH'
    });
  }

  // Cylinder Operations
  async notifyCylinderAdded(cylinderCode: string, cylinderType: string, userEmail: string) {
    return createNotification({
      type: 'CYLINDER_ADDED',
      title: 'New Cylinder Added',
      message: `Cylinder ${cylinderCode} (${cylinderType}) has been added to inventory.`,
      metadata: { cylinderCode, cylinderType, userEmail, operation: 'CREATE' },
      priority: 'MEDIUM'
    });
  }

  async notifyCylinderUpdated(cylinderCode: string, userEmail: string, changes: string[]) {
    return createNotification({
      type: 'CYLINDER_UPDATED',
      title: 'Cylinder Updated',
      message: `Cylinder ${cylinderCode} has been updated. Changes: ${changes.join(', ')}`,
      metadata: { cylinderCode, userEmail, changes, operation: 'UPDATE' },
      priority: 'MEDIUM'
    });
  }

  async notifyCylinderStatusChanged(cylinderCode: string, oldStatus: string, newStatus: string, userEmail: string) {
    return createNotification({
      type: 'CYLINDER_STATUS_CHANGED',
      title: 'Cylinder Status Changed',
      message: `Cylinder ${cylinderCode} status changed from ${oldStatus} to ${newStatus}.`,
      metadata: { cylinderCode, oldStatus, newStatus, userEmail, operation: 'STATUS_CHANGE' },
      priority: 'HIGH'
    });
  }

  async notifyCylinderDeleted(cylinderCode: string, userEmail: string) {
    return createNotification({
      type: 'CYLINDER_DELETED',
      title: 'Cylinder Removed',
      message: `Cylinder ${cylinderCode} has been removed from inventory.`,
      metadata: { cylinderCode, userEmail, operation: 'DELETE' },
      priority: 'HIGH'
    });
  }

  // Rental Operations
  async notifyRentalCreated(customerName: string, cylinderCode: string, userEmail: string) {
    return createNotification({
      type: 'RENTAL_CREATED',
      title: 'New Rental Created',
      message: `Rental created for ${customerName} with cylinder ${cylinderCode}.`,
      metadata: { customerName, cylinderCode, userEmail, operation: 'CREATE' },
      priority: 'MEDIUM'
    });
  }

  async notifyRentalCompleted(customerName: string, cylinderCode: string, userEmail: string) {
    return createNotification({
      type: 'RENTAL_COMPLETED',
      title: 'Rental Completed',
      message: `Rental completed for ${customerName} with cylinder ${cylinderCode}.`,
      metadata: { customerName, cylinderCode, userEmail, operation: 'COMPLETE' },
      priority: 'MEDIUM'
    });
  }

  async notifyRentalOverdue(customerName: string, cylinderCode: string, daysOverdue: number) {
    return createNotification({
      type: 'RENTAL_UPDATED',
      title: 'Rental Overdue',
      message: `Rental for ${customerName} with cylinder ${cylinderCode} is ${daysOverdue} days overdue.`,
      metadata: { customerName, cylinderCode, daysOverdue, operation: 'OVERDUE' },
      priority: 'URGENT'
    });
  }

  // Financial Operations
  async notifyPaymentReceived(amount: number, customerName: string, paymentMethod: string) {
    return createNotification({
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `Payment of $${amount.toFixed(2)} received from ${customerName} via ${paymentMethod}.`,
      metadata: { amount, customerName, paymentMethod, operation: 'PAYMENT' },
      priority: 'HIGH'
    });
  }

  async notifyExpenseAdded(amount: number, category: string, description: string, userEmail: string) {
    return createNotification({
      type: 'EXPENSE_ADDED',
      title: 'New Expense Added',
      message: `New ${category} expense of $${amount.toFixed(2)}: ${description}`,
      metadata: { amount, category, description, userEmail, operation: 'CREATE' },
      priority: 'MEDIUM'
    });
  }

  // Inventory Alerts
  async notifyLowInventory(cylinderType: string, currentCount: number, threshold: number = 5) {
    return createNotification({
      type: 'LOW_INVENTORY',
      title: 'Low Inventory Alert',
      message: `${cylinderType} cylinders are running low (${currentCount} remaining). Threshold: ${threshold}`,
      metadata: { cylinderType, currentCount, threshold, operation: 'INVENTORY_ALERT' },
      priority: 'URGENT'
    });
  }

  async notifyMaintenanceDue(cylinderCode: string, daysUntilDue: number) {
    const priority = daysUntilDue <= 3 ? 'URGENT' : daysUntilDue <= 7 ? 'HIGH' : 'MEDIUM';
    return createNotification({
      type: 'MAINTENANCE_DUE',
      title: 'Maintenance Due Soon',
      message: `Cylinder ${cylinderCode} requires maintenance in ${daysUntilDue} days.`,
      metadata: { cylinderCode, daysUntilDue, operation: 'MAINTENANCE_ALERT' },
      priority
    });
  }

  // System Alerts
  async notifySystemAlert(title: string, message: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM') {
    return createNotification({
      type: 'SYSTEM_ALERT',
      title,
      message,
      metadata: { operation: 'SYSTEM_ALERT' },
      priority
    });
  }

  async notifyUserActivity(userEmail: string, action: string, details: string) {
    return createNotification({
      type: 'USER_ACTIVITY',
      title: 'User Activity',
      message: `${userEmail} performed: ${action} - ${details}`,
      metadata: { userEmail, action, details, operation: 'USER_ACTIVITY' },
      priority: 'LOW'
    });
  }

  // Error Notifications
  async notifyError(operation: string, error: string, userEmail?: string) {
    return createNotification({
      type: 'SYSTEM_ALERT',
      title: 'Operation Failed',
      message: `Failed to ${operation}: ${error}`,
      metadata: { operation, error, userEmail, operationType: 'ERROR' },
      priority: 'HIGH'
    });
  }

  // Success Notifications
  async notifySuccess(operation: string, details: string, userEmail?: string) {
    return createNotification({
      type: 'SYSTEM_ALERT',
      title: 'Operation Successful',
      message: `Successfully ${operation}: ${details}`,
      metadata: { operation, details, userEmail, operationType: 'SUCCESS' },
      priority: 'LOW'
    });
  }

  // Bulk Operations
  async notifyBulkOperation(operation: string, count: number, entityType: string, userEmail: string) {
    return createNotification({
      type: 'SYSTEM_ALERT',
      title: 'Bulk Operation Completed',
      message: `Successfully ${operation} ${count} ${entityType} records.`,
      metadata: { operation, count, entityType, userEmail, operationType: 'BULK' },
      priority: 'MEDIUM'
    });
  }

  // Custom Notifications
  async notifyCustom(type: string, title: string, message: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM', metadata?: Record<string, any>) {
    return createNotification({
      type: type as any,
      title,
      message,
      metadata: { ...metadata, operation: 'CUSTOM' },
      priority
    });
  }
}

// Export singleton instance
export const notificationIntegration = NotificationIntegrationService.getInstance();

// Convenience functions for common operations
export const notifyCustomerCreated = (customerName: string, customerCode: string, userEmail: string) =>
  notificationIntegration.notifyCustomerCreated(customerName, customerCode, userEmail);

export const notifyVendorCreated = (vendorName: string, vendorCode: string, userEmail: string) =>
  notificationIntegration.notifyVendorCreated(vendorName, vendorCode, userEmail);

export const notifyCylinderAdded = (cylinderCode: string, cylinderType: string, userEmail: string) =>
  notificationIntegration.notifyCylinderAdded(cylinderCode, cylinderType, userEmail);

export const notifyPaymentReceived = (amount: number, customerName: string, paymentMethod: string) =>
  notificationIntegration.notifyPaymentReceived(amount, customerName, paymentMethod);

export const notifyLowInventory = (cylinderType: string, currentCount: number, threshold?: number) =>
  notificationIntegration.notifyLowInventory(cylinderType, currentCount, threshold);

export const notifySystemAlert = (title: string, message: string, priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') =>
  notificationIntegration.notifySystemAlert(title, message, priority); 