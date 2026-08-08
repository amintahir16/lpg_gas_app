/**
 * Newest-first ordering for ledger / transaction report lists.
 * date → time → bill number → createdAt
 */
export function compareTransactionsNewestFirst(
  a: {
    date: Date | string;
    time?: Date | string | null;
    billSno?: string | number | null;
    createdAt?: Date | string | null;
  },
  b: {
    date: Date | string;
    time?: Date | string | null;
    billSno?: string | number | null;
    createdAt?: Date | string | null;
  }
): number {
  const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
  if (byDate !== 0) return byDate;

  const timeA = a.time ? new Date(a.time).getTime() : 0;
  const timeB = b.time ? new Date(b.time).getTime() : 0;
  const byTime = timeB - timeA;
  if (byTime !== 0) return byTime;

  const byBill = Number(b.billSno) - Number(a.billSno);
  if (byBill !== 0) return byBill;

  const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return createdB - createdA;
}

export function sortTransactionsNewestFirst<T extends {
  date: Date | string;
  time?: Date | string | null;
  billSno?: string | number | null;
  createdAt?: Date | string | null;
}>(transactions: T[]): T[] {
  return [...transactions].sort(compareTransactionsNewestFirst);
}
