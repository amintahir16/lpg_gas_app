import { prisma } from '@/lib/db';
import { NotificationPriority } from '@prisma/client';

/**
 * Robustly checks for stagnant Accounts Receivable (AR).
 * If a customer has a debt (ledgerBalance > 0) and hasn't made a payment
 * for over 7 days, it notifies all SUPER_ADMINs.
 */
export async function checkAndNotifyStagnantAR() {
  console.log('[AR-Notifier] Starting stagnant AR check...');
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Find all B2B customers who owe money
  const customersWithDebt = await prisma.customer.findMany({
    where: {
      ledgerBalance: { gt: 0 },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      ledgerBalance: true,
      regionId: true,
      region: { select: { name: true } },
    },
  });

  console.log(`[AR-Notifier] Found ${customersWithDebt.length} customers with outstanding balance.`);

  for (const customer of customersWithDebt) {
    // 2. Check for ANY transaction that decreased the balance in the last 7 days
    // This includes PAYMENT, BUYBACK, ADJUSTMENT, and CREDIT_NOTE
    const recentPayment = await prisma.b2BTransaction.findFirst({
      where: {
        customerId: customer.id,
        transactionType: { in: ['PAYMENT', 'BUYBACK', 'ADJUSTMENT', 'CREDIT_NOTE'] as any },
        date: { gte: sevenDaysAgo },
        voided: false,
      },
    });

    if (!recentPayment) {
      // 3. Robustness check: Have we already notified about THIS customer in the last 7 days?
      // We check for a notification with specific metadata to avoid spam.
      const existingNotification = await prisma.notification.findFirst({
        where: {
          type: 'SYSTEM_ALERT',
          metadata: { contains: `"customerId":"${customer.id}"` },
          createdAt: { gte: sevenDaysAgo },
        },
      });

      if (existingNotification) {
        console.log(`[AR-Notifier] Notification already sent recently for ${customer.name}. Skipping.`);
        continue;
      }

      // 4. Send the notification
      const balance = Math.round(parseFloat(customer.ledgerBalance.toString())).toLocaleString();
      const regionName = customer.region?.name || 'Main Branch';
      const title = `Stagnant AR Alert: ${customer.name} (${regionName})`;
      const message = `Customer "${customer.name}" in branch "${regionName}" hasn't made any payment for over 7 days and currently owes Rs ${balance}.`;
      
      console.log(`[AR-Notifier] Notifying Super Admins: ${message}`);

      // Find all super admins to notify
      const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN', isActive: true },
        select: { id: true },
      });

      if (superAdmins.length === 0) {
        console.warn('[AR-Notifier] No active SUPER_ADMINs found to notify.');
        continue;
      }

      // Create notifications for all super admins
      await prisma.notification.createMany({
        data: superAdmins.map(admin => ({
          userId: admin.id,
          type: 'SYSTEM_ALERT',
          title,
          message,
          priority: 'HIGH' as NotificationPriority,
          regionId: customer.regionId,
          link: `/customers/b2b/${customer.id}`,
          metadata: JSON.stringify({
            domain: 'STAGNANT_AR',
            customerId: customer.id,
            customerName: customer.name,
            amountOwed: balance,
            lastChecked: new Date().toISOString()
          }),
        })),
      });
    }
  }
  
  console.log('[AR-Notifier] Stagnant AR check completed.');
}
