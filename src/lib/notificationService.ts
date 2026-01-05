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

// Enhanced notification service with better error handling and performance
export class NotificationService {
  private static instance: NotificationService;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheckTime: Date = new Date();
  private isRunning: boolean = false;
  private errorCount: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 5000; // 5 seconds

  private constructor() { }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Start monitoring database changes with enhanced error handling
  public async startMonitoring() {
    if (this.isRunning) {
      console.log('Notification monitoring is already running');
      return;
    }

    try {
      this.isRunning = true;
      this.errorCount = 0;

      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }

      // Check for changes every 3 seconds
      this.checkInterval = setInterval(async () => {
        await this.checkForChanges();
      }, 3000);

      console.log('Notification monitoring started - checking every 3 seconds');
    } catch (error) {
      console.error('Failed to start notification monitoring:', error);
      this.isRunning = false;
      throw error;
    }
  }

  // Stop monitoring
  public stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('Notification monitoring stopped');
  }

  // Check if service is running
  public isServiceRunning(): boolean {
    return this.isRunning;
  }

  // Get service status
  public getServiceStatus() {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      errorCount: this.errorCount,
      maxRetries: this.maxRetries
    };
  }

  // Check for database changes and create notifications with retry mechanism
  private async checkForChanges() {
    try {
      const now = new Date();

      // Check for new cylinders added
      await this.retryOperation(() => this.checkNewCylinders());

      // Check for cylinder status changes
      await this.retryOperation(() => this.checkCylinderStatusChanges());

      // Check for new vendors
      await this.retryOperation(() => this.checkNewVendors());

      // Check for new customers
      await this.retryOperation(() => this.checkNewCustomers());

      // Check for new expenses
      await this.retryOperation(() => this.checkNewExpenses());

      // Check for low inventory
      await this.retryOperation(() => this.checkLowInventory());

      // Check for maintenance due
      await this.retryOperation(() => this.checkMaintenanceDue());

      // Check for new rentals
      await this.retryOperation(() => this.checkNewRentals());

      // Check for completed rentals
      await this.retryOperation(() => this.checkCompletedRentals());

      this.lastCheckTime = now;
      this.errorCount = 0; // Reset error count on successful check
    } catch (error) {
      this.errorCount++;
      console.error(`Error checking for changes (attempt ${this.errorCount}):`, error);

      // If too many errors, stop the service
      if (this.errorCount >= this.maxRetries) {
        console.error('Too many errors, stopping notification service');
        this.stopMonitoring();
      }
    }
  }

  // Retry operation with exponential backoff
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // Check for new cylinders with optimized query
  private async checkNewCylinders() {
    try {
      const newCylinders = await prisma.cylinder.findMany({
        where: {
          createdAt: {
            gt: this.lastCheckTime
          }
        },
        select: {
          id: true,
          code: true,
          cylinderType: true,
          createdAt: true
        }
      });

      for (const cylinder of newCylinders) {
        await createCylinderAddedNotification(
          cylinder.code,
          'system@lpg-gas.com', // Default system user
          cylinder.cylinderType
        );
      }
    } catch (error) {
      console.error('Error checking for new cylinders:', error);
      throw error;
    }
  }

  // Check for cylinder status changes
  private async checkCylinderStatusChanges() {
    try {
      // This would need a more sophisticated approach to track status changes
      // For now, we'll implement a basic check
      const cylindersWithRecentUpdates = await prisma.cylinder.findMany({
        where: {
          updatedAt: {
            gt: this.lastCheckTime
          }
        },
        select: {
          id: true,
          code: true,
          currentStatus: true,
          updatedAt: true
        }
      });

      // In a real implementation, you'd compare with previous state
      // For now, we'll just log the updates
      console.log(`Found ${cylindersWithRecentUpdates.length} cylinders with recent updates`);
    } catch (error) {
      console.error('Error checking for cylinder status changes:', error);
      throw error;
    }
  }

  // Check for new vendors
  private async checkNewVendors() {
    try {
      const newVendors = await prisma.vendor.findMany({
        where: {
          createdAt: {
            gt: this.lastCheckTime
          }
        },
        select: {
          id: true,
          companyName: true,
          vendorCode: true,
          createdAt: true
        }
      });

      for (const vendor of newVendors) {
        await createVendorAddedNotification(
          vendor.companyName,
          'system@lpg-gas.com',
          vendor.vendorCode
        );
      }
    } catch (error) {
      console.error('Error checking for new vendors:', error);
      throw error;
    }
  }

  // Check for new customers
  private async checkNewCustomers() {
    try {
      const newCustomers = await prisma.customer.findMany({
        where: {
          createdAt: {
            gt: this.lastCheckTime
          }
        },
        select: {
          id: true,
          name: true,
          phone: true,
          createdAt: true
        }
      });

      for (const customer of newCustomers) {
        await createCustomerAddedNotification(
          customer.name,
          'system@lpg-gas.com',
          customer.phone,
        );
      }
    } catch (error) {
      console.error('Error checking for new customers:', error);
      throw error;
    }
  }

  // Check for new expenses
  private async checkNewExpenses() {
    try {
      const newExpenses = await prisma.expense.findMany({
        where: {
          createdAt: {
            gt: this.lastCheckTime
          }
        },
        select: {
          id: true,
          amount: true,
          category: true,
          description: true,
          createdAt: true
        }
      });

      for (const expense of newExpenses) {
        await createExpenseAddedNotification(
          Number(expense.amount),
          expense.category,
          'system@lpg-gas.com',
          expense.description
        );
      }
    } catch (error) {
      console.error('Error checking for new expenses:', error);
      throw error;
    }
  }

  // Check for low inventory
  private async checkLowInventory() {
    try {
      // Check for cylinders with low availability
      const lowInventoryCylinders = await prisma.cylinder.findMany({
        where: {
          currentStatus: 'FULL'
        },
        select: {
          id: true,
          code: true,
          cylinderType: true
        }
      });

      // If less than 5 cylinders available, create low inventory notification
      if (lowInventoryCylinders.length < 5) {
        await createLowInventoryNotification(
          'GENERAL',
          lowInventoryCylinders.length
        );
      }
    } catch (error) {
      console.error('Error checking for low inventory:', error);
      throw error;
    }
  }

  // Check for maintenance due
  private async checkMaintenanceDue() {
    try {
      const maintenanceDueCylinders = await prisma.cylinder.findMany({
        where: {
          nextMaintenanceDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          }
        },
        select: {
          id: true,
          code: true,
          nextMaintenanceDate: true
        }
      });

      for (const cylinder of maintenanceDueCylinders) {
        if (cylinder.nextMaintenanceDate) {
          const daysUntilDue = Math.ceil(
            (cylinder.nextMaintenanceDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          );
          await createMaintenanceDueNotification(
            cylinder.code,
            daysUntilDue
          );
        }
      }
    } catch (error) {
      console.error('Error checking for maintenance due:', error);
      throw error;
    }
  }

  // Check for new rentals
  private async checkNewRentals() {
    try {
      const newRentals = await prisma.cylinderRental.findMany({
        where: {
          createdAt: {
            gt: this.lastCheckTime
          }
        },
        select: {
          id: true,
          customer: {
            select: {
              name: true
            }
          },
          cylinder: {
            select: {
              code: true
            }
          },
          createdAt: true
        }
      });

      for (const rental of newRentals) {
        await createRentalCreatedNotification(
          rental.customer.name,
          rental.cylinder.code,
          'system@lpg-gas.com'
        );
      }
    } catch (error) {
      console.error('Error checking for new rentals:', error);
      throw error;
    }
  }

  // Check for completed rentals
  private async checkCompletedRentals() {
    try {
      const completedRentals = await prisma.cylinderRental.findMany({
        where: {
          status: 'RETURNED',
          updatedAt: {
            gt: this.lastCheckTime
          }
        },
        select: {
          id: true,
          customer: {
            select: {
              name: true
            }
          },
          cylinder: {
            select: {
              code: true
            }
          },
          updatedAt: true
        }
      });

      for (const rental of completedRentals) {
        await createRentalCompletedNotification(
          rental.customer.name,
          rental.cylinder.code,
          'system@lpg-gas.com'
        );
      }
    } catch (error) {
      console.error('Error checking for completed rentals:', error);
      throw error;
    }
  }

  // Manual notification creation for immediate use
  public async createManualNotification(
    type: string,
    title: string,
    message: string,
    userId?: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM',
    metadata?: Record<string, any>
  ) {
    try {
      return await createNotification({
        type: type as any,
        title,
        message,
        userId,
        metadata,
        priority
      });
    } catch (error) {
      console.error('Error creating manual notification:', error);
      throw error;
    }
  }

  // Bulk notification operations
  public async createBulkNotifications(notifications: Array<{
    type: string;
    title: string;
    message: string;
    userId?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    metadata?: Record<string, any>;
  }>) {
    try {
      const createdNotifications = [];

      for (const notification of notifications) {
        const created = await this.createManualNotification(
          notification.type,
          notification.title,
          notification.message,
          notification.userId,
          notification.priority,
          notification.metadata
        );
        createdNotifications.push(created);
      }

      return createdNotifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Cleanup old notifications
  public async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          isRead: true
        }
      });

      console.log(`Cleaned up ${deletedCount.count} old notifications`);
      return deletedCount.count;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  // Get notification statistics
  public async getNotificationStats() {
    try {
      const [total, unread, urgent] = await Promise.all([
        prisma.notification.count(),
        prisma.notification.count({ where: { isRead: false } }),
        prisma.notification.count({
          where: {
            isRead: false,
            priority: 'URGENT'
          }
        })
      ]);

      return { total, unread, urgent };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
} 