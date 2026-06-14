import { Prisma } from '@prisma/client';

/** User-facing message when a Prisma/database error occurs in API routes. */
export function databaseActionErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021') {
      return 'Database tables are missing on this server. Redeploy after running database migrations, or contact your administrator.';
    }
    if (error.code === 'P2022') {
      return 'Database schema is out of date on this server. Run the latest migration and redeploy.';
    }
  }

  if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
