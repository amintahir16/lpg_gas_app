import { prisma } from '@/lib/db';

const CACHE_MS = 10 * 60 * 1000;
const DEFAULT_LIMIT_MB = 1024;
const NEON_API_BASE = 'https://console.neon.tech/api/v2';
const NEON_TIMEOUT_MS = 5000;

export interface DatabaseStorageTable {
  name: string;
  bytes: number;
}

export interface DatabaseStorageInfo {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  /** `neon`: branch data size reported by Neon. `database`: pg_database_size of the connected database. */
  usageSource: 'neon' | 'database';
  limitSource: 'neon' | 'config';
  /** Neon project storage including change history (not what the plan limit is measured against). */
  neonTotalStorageBytes: number | null;
  largestTables: DatabaseStorageTable[];
  checkedAt: string;
  neonError: string | null;
}

let cache: { at: number; data: DatabaseStorageInfo } | null = null;

function configuredLimitBytes(): number {
  const mb = Number(process.env.DB_STORAGE_LIMIT_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_LIMIT_MB) * 1024 * 1024;
}

async function neonGet<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${NEON_API_BASE}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(NEON_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Neon API responded ${res.status}`);
  return res.json() as Promise<T>;
}

/** Returns null when Neon credentials are not configured (e.g. local development). */
async function readNeonStorage(): Promise<{
  usedBytes: number;
  limitBytes: number | null;
  totalStorageBytes: number | null;
} | null> {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  if (!apiKey || !projectId) return null;

  const [{ project }, { branches }] = await Promise.all([
    neonGet<{ project: { branch_logical_size_limit_bytes?: number; synthetic_storage_size?: number } }>(
      `/projects/${encodeURIComponent(projectId)}`,
      apiKey
    ),
    neonGet<{ branches: Array<{ id: string; default?: boolean; primary?: boolean; logical_size?: number }> }>(
      `/projects/${encodeURIComponent(projectId)}/branches`,
      apiKey
    ),
  ]);

  const branchId = process.env.NEON_BRANCH_ID;
  const branch = branchId
    ? branches.find((b) => b.id === branchId)
    : branches.find((b) => b.default) ?? branches.find((b) => b.primary);
  if (!branch || typeof branch.logical_size !== 'number') {
    throw new Error('Neon did not report a size for the database branch');
  }

  const limit = Number(project.branch_logical_size_limit_bytes);
  return {
    usedBytes: branch.logical_size,
    limitBytes: Number.isFinite(limit) && limit > 0 ? limit : null,
    totalStorageBytes: typeof project.synthetic_storage_size === 'number' ? project.synthetic_storage_size : null,
  };
}

async function readDatabaseSize(): Promise<{ sizeBytes: number; largestTables: DatabaseStorageTable[] }> {
  const [sizeRows, tableRows] = await Promise.all([
    prisma.$queryRaw<Array<{ size: bigint }>>`SELECT pg_database_size(current_database()) AS size`,
    prisma.$queryRaw<Array<{ name: string; bytes: bigint }>>`
      SELECT relname AS name, pg_total_relation_size(relid) AS bytes
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 5`,
  ]);
  return {
    sizeBytes: Number(sizeRows[0]?.size ?? 0),
    largestTables: tableRows.map((t) => ({ name: t.name, bytes: Number(t.bytes) })),
  };
}

/**
 * Database storage usage against the plan limit. Uses Neon's API when
 * NEON_API_KEY + NEON_PROJECT_ID are set (production), otherwise the size of the
 * connected database against DB_STORAGE_LIMIT_MB (default 1 GB). Cached for 10 minutes.
 */
export async function getDatabaseStorageInfo(options: { refresh?: boolean } = {}): Promise<DatabaseStorageInfo> {
  if (!options.refresh && cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const local = await readDatabaseSize();

  let neon: Awaited<ReturnType<typeof readNeonStorage>> = null;
  let neonError: string | null = null;
  try {
    neon = await readNeonStorage();
  } catch (error) {
    neonError = error instanceof Error ? error.message : 'Neon API request failed';
  }

  const usedBytes = neon ? neon.usedBytes : local.sizeBytes;
  const limitBytes = neon?.limitBytes ?? configuredLimitBytes();
  const data: DatabaseStorageInfo = {
    usedBytes,
    limitBytes,
    remainingBytes: Math.max(0, limitBytes - usedBytes),
    percentUsed: limitBytes > 0 ? Math.round((usedBytes / limitBytes) * 1000) / 10 : 0,
    usageSource: neon ? 'neon' : 'database',
    limitSource: neon?.limitBytes ? 'neon' : 'config',
    neonTotalStorageBytes: neon?.totalStorageBytes ?? null,
    largestTables: local.largestTables,
    checkedAt: new Date().toISOString(),
    neonError,
  };

  cache = { at: Date.now(), data };
  return data;
}
