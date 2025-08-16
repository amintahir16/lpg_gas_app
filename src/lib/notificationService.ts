import { prisma } from '@/lib/db';
import { 
  createNotification, 
  createCylinderAddedNotification,
  createCylinderUpdatedNotification,
  createCylinderDeletedNotification,
  createCylinderStatusChangedNotification,
  createVendorAddedNotification,
  createVendorUpdatedNotification,
  createVendorDeletedNotification,
  createCustomerAddedNotification,
  createCustomerUpdatedNotification,
  createCustomerDeletedNotification,
  createExpenseAddedNotification,
  createExpenseUpdatedNotification,
  createExpenseDeletedNotification,
  createPaymentReceivedNotification,
  createRentalCreatedNotification,
  createRentalCompletedNotification,
  createLowInventoryNotification,
  createMaintenanceDueNotification
} from './notifications';

// Real-time notification service
export class NotificationService {
  private static instance: NotificationService;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheckTime: Date = new Date();

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Start monitoring database changes
  public startMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check for changes every 3 seconds
    this.checkInterval = setInterval(async () => {
      await this.checkForChanges();
    }, 3000);

    console.log('Notification monitoring started - checking every 3 seconds');
  }

  // Stop monitoring
  public stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('Notification monitoring stopped');
  }

  // Check for database changes and create notifications
  private async checkForChanges() {
    try {
      const now = new Date();
      
      // Check for new cylinders added
      await this.checkNewCylinders();
      
      // Check for cylinder status changes
      await this.checkCylinderStatusChanges();
      
      // Check for new vendors
      await this.checkNewVendors();
      
      // Check for new customers
      await this.checkNewCustomers();
      
      // Check for new expenses
      await this.checkNewExpenses();
      
      // Check for low inventory
      await this.checkLowInventory();
      
      // Check for maintenance due
      await this.checkMaintenanceDue();
      
      // Check for new rentals
      await this.checkNewRentals();
      
      // Check for completed rentals
      await this.checkCompletedRentals();
      
      this.lastCheckTime = now;
    } catch (error) {
      console.error('Error checking for changes:', error);
    }
  }

  // Check for new cylinders
  private async checkNewCylinders() {
    const newCylinders = await prisma.cylinder.findMany({
      where: {
        createdAt: {
          gt: this.lastCheckTime
        }
      },
      include: {
        cylinderRentals: true
      }
    });

    for (const cylinder of newCylinders) {
      try {
        await createCylinderAddedNotification(
          cylinder.code,
          'System',
          cylinder.cylinderType
        );
      } catch (error) {
        console.error('Failed to create cylinder added notification:', error);
      }
    }
  }

  // Check for cylinder status changes
  private async checkCylinderStatusChanges() {
    // This would require tracking previous status values
    // For now, we'll rely on explicit notifications from API calls
  }

  // Check for new vendors
  private async checkNewVendors() {
    const newVendors = await prisma.vendor.findMany({
      where: {
        createdAt: {
          gt: this.lastCheckTime
        }
      }
    });

    for (const vendor of newVendors) {
      try {
        await createVendorAddedNotification(
          vendor.companyName,
          'System',
          vendor.vendorCode
        );
      } catch (error) {
        console.error('Failed to create vendor added notification:', error);
      }
    }
  }

  // Check for new customers
  private async checkNewCustomers() {
    const newCustomers = await prisma.customer.findMany({
      where: {
        createdAt: {
          gt: this.lastCheckTime
        }
      }
    });

    for (const customer of newCustomers) {
      try {
        await createCustomerAddedNotification(
          `${customer.firstName} ${customer.lastName}`,
          'System',
          customer.code
        );
      } catch (error) {
        console.error('Failed to create customer added notification:', error);
      }
    }
  }

  // Check for new expenses
  private async checkNewExpenses() {
    const newExpenses = await prisma.expense.findMany({
      where: {
        createdAt: {
          gt: this.lastCheckTime
        }
      }
    });

    for (const expense of newExpenses) {
      try {
        await createExpenseAddedNotification(
          Number(expense.amount),
          expense.category,
          'System',
          expense.description
        );
      } catch (error) {
        console.error('Failed to create expense added notification:', error);
      }
    }
  }

  // Check for low inventory
  private async checkLowInventory() {
    const lowInventoryThreshold = 5; // Alert when less than 5 cylinders

    const lowInventory = await prisma.cylinder.groupBy({
      by: ['cylinderType'],
      where: {
        currentStatus: 'AVAILABLE'
      },
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            lt: lowInventoryThreshold
          }
        }
      }
    });

    for (const item of lowInventory) {
      try {
        await createLowInventoryNotification(
          item.cylinderType,
          item._count.id
        );
      } catch (error) {
        console.error('Failed to create low inventory notification:', error);
      }
    }
  }

  // Check for maintenance due
  private async checkMaintenanceDue() {
    const maintenanceThreshold = 7; // Alert when maintenance is due in 7 days or less
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + (maintenanceThreshold * 24 * 60 * 60 * 1000));

    const maintenanceDue = await prisma.cylinder.findMany({
      where: {
        nextMaintenanceDate: {
          lte: thresholdDate,
          gt: now
        },
        currentStatus: {
          not: 'RETIRED'
        }
      }
    });

    for (const cylinder of maintenanceDue) {
      if (cylinder.nextMaintenanceDate) {
        const daysUntilDue = Math.ceil(
          (cylinder.nextMaintenanceDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        try {
          await createMaintenanceDueNotification(
            cylinder.code,
            daysUntilDue
          );
        } catch (error) {
          console.error('Failed to create maintenance due notification:', error);
        }
      }
    }
  }

  // Check for new rentals
  private async checkNewRentals() {
    const newRentals = await prisma.cylinderRental.findMany({
      where: {
        createdAt: {
          gt: this.lastCheckTime
        }
      },
      include: {
        customer: true,
        cylinder: true
      }
    });

    for (const rental of newRentals) {
      try {
        await createRentalCreatedNotification(
          `${rental.customer.firstName} ${rental.customer.lastName}`,
          rental.cylinder.code,
          'System'
        );
      } catch (error) {
        console.error('Failed to create rental created notification:', error);
      }
    }
  }

  // Check for completed rentals
  private async checkCompletedRentals() {
    const completedRentals = await prisma.cylinderRental.findMany({
      where: {
        updatedAt: {
          gt: this.lastCheckTime
        },
        status: 'RETURNED'
      },
      include: {
        customer: true,
        cylinder: true
      }
    });

    for (const rental of completedRentals) {
      try {
        await createRentalCompletedNotification(
          `${rental.customer.firstName} ${rental.customer.lastName}`,
          rental.cylinder.code,
          'System'
        );
      } catch (error) {
        console.error('Failed to create rental completed notification:', error);
      }
    }
  }

  // Manual notification creation for immediate feedback
  public async createImmediateNotification(
    type: string,
    title: string,
    message: string,
    userId?: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM',
    metadata?: Record<string, any>
  ) {
    try {
      await createNotification({
        type: type as any,
        title,
        message,
        userId,
        priority,
        metadata
      });
    } catch (error) {
      console.error('Failed to create immediate notification:', error);
    }
  }

  // Get notification statistics
  public async getStats() {
    try {
      const [total, unread, urgent] = await Promise.all([
        prisma.notification.count(),
        prisma.notification.count({ where: { isRead: false } }),
        prisma.notification.count({ where: { priority: 'URGENT', isRead: false } })
      ]);

      return { total, unread, urgent };
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return { total: 0, unread: 0, urgent: 0 };
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance(); 