import { prisma } from '@/lib/db';
import { NotificationPriority } from '@prisma/client';

/**
 * Robustly checks for stagnant Accounts Receivable (AR).
 * If a customer has a debt (ledgerBalance > 0) and hasn't made a payment
 * for over 7 days, it notifies all SUPER_ADMINs.
 *
 * Batched queries (same outcomes as the prior per-customer N+1 loop).
 */
export async function checkAndNotifyStagnantAR() {
  console.log('[AR-Notifier] Starting stagnant AR check...');

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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

  if (customersWithDebt.length === 0) {
    console.log('[AR-Notifier] Stagnant AR check completed.');
    return;
  }

  const customerIds = customersWithDebt.map((c) => c.id);

  const [recentPaymentRows, recentNotifications, superAdmins] = await Promise.all([
    prisma.b2BTransaction.findMany({
      where: {
        customerId: { in: customerIds },
        transactionType: { in: ['PAYMENT', 'BUYBACK', 'ADJUSTMENT', 'CREDIT_NOTE'] as any },
        date: { gte: sevenDaysAgo },
        voided: false,
      },
      select: { customerId: true },
      distinct: ['customerId'],
    }),
    prisma.notification.findMany({
      where: {
        type: 'SYSTEM_ALERT',
        createdAt: { gte: sevenDaysAgo },
        metadata: { contains: '"domain":"STAGNANT_AR"' },
      },
      select: { metadata: true },
    }),
    prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', isActive: true },
      select: { id: true },
    }),
  ]);

  const recentlyPaid = new Set(recentPaymentRows.map((r) => r.customerId));
  const alreadyNotified = new Set<string>();
  for (const n of recentNotifications) {
    if (!n.metadata) continue;
    try {
      const meta = JSON.parse(n.metadata);
      if (meta?.customerId) alreadyNotified.add(String(meta.customerId));
    } catch {
      const match = n.metadata.match(/"customerId"\s*:\s*"([^"]+)"/);
      if (match?.[1]) alreadyNotified.add(match[1]);
    }
  }

  if (superAdmins.length === 0) {
    console.warn('[AR-Notifier] No active SUPER_ADMINs found to notify.');
    console.log('[AR-Notifier] Stagnant AR check completed.');
    return;
  }

  const notificationsToCreate: Array<{
    userId: string;
    type: 'SYSTEM_ALERT';
    title: string;
    message: string;
    priority: NotificationPriority;
    regionId: string | null;
    link: string;
    metadata: string;
  }> = [];

  for (const customer of customersWithDebt) {
    if (recentlyPaid.has(customer.id)) continue;
    if (alreadyNotified.has(customer.id)) {
      console.log(`[AR-Notifier] Notification already sent recently for ${customer.name}. Skipping.`);
      continue;
    }

    const balance = Math.round(parseFloat(customer.ledgerBalance.toString())).toLocaleString();
    const regionName = customer.region?.name || 'Main Branch';
    const title = `Stagnant AR Alert: ${customer.name} (${regionName})`;
    const message = `Customer "${customer.name}" in branch "${regionName}" hasn't made any payment for over 7 days and currently owes Rs ${balance}.`;

    console.log(`[AR-Notifier] Notifying Super Admins: ${message}`);

    const metadata = JSON.stringify({
      domain: 'STAGNANT_AR',
      customerId: customer.id,
      customerName: customer.name,
      amountOwed: balance,
      lastChecked: new Date().toISOString(),
    });

    for (const admin of superAdmins) {
      notificationsToCreate.push({
        userId: admin.id,
        type: 'SYSTEM_ALERT',
        title,
        message,
        priority: 'HIGH' as NotificationPriority,
        regionId: customer.regionId,
        link: `/customers/b2b/${customer.id}`,
        metadata,
      });
    }
  }

  if (notificationsToCreate.length > 0) {
    await prisma.notification.createMany({ data: notificationsToCreate });
  }

  console.log('[AR-Notifier] Stagnant AR check completed.');
}
