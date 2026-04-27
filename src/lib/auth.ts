import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * Per-email login throttle.
 *
 * NextAuth's `authorize` callback does not give us direct access to the
 * underlying `NextRequest`, so IP-based rate limiting has to live in
 * dedicated middleware (we use the in-memory limiter elsewhere). Here we
 * additionally cap attempts per-email so that an attacker targeting one
 * known admin account cannot simply rotate IPs to brute-force the
 * password — they would still trip this counter.
 */
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const emailKey = credentials.email.toLowerCase().trim();
          const limit = checkRateLimit(emailKey, {
            name: 'auth:login',
            limit: LOGIN_LIMIT,
            windowMs: LOGIN_WINDOW_MS,
          });
          if (!limit.ok) {
            console.warn(`Login throttled for ${emailKey}; retry after ${limit.retryAfterSeconds}s`);
            return null;
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            },
            include: {
              userRegions: { select: { regionId: true } },
            },
          });

          if (!user || !user.password) {
            return null;
          }

          // Block disabled users from authenticating. We check this *before*
          // bcrypt to avoid leaking timing info about whether disabled
          // accounts exist, but after the existence check so a generic
          // attacker cannot enumerate via timing alone.
          if (user.isActive === false) {
            console.warn(`Login attempt for inactive user ${user.email}`);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          // Strict Role Based Access Control
          // Only allow ADMIN and SUPER_ADMIN to login
          if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
            console.warn(`Login attempt denied for user ${user.email} with role ${user.role}`);
            return null;
          }

          // Compute the union of accessible region ids (primary first).
          const accessibleIds: string[] = [];
          const seen = new Set<string>();
          if (user.regionId) {
            seen.add(user.regionId);
            accessibleIds.push(user.regionId);
          }
          for (const ur of user.userRegions) {
            if (!seen.has(ur.regionId)) {
              seen.add(ur.regionId);
              accessibleIds.push(ur.regionId);
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            regionId: user.regionId ?? null,
            regionIds: accessibleIds,
          };
        } catch (error) {
          console.error('NextAuth authorize error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      try {
        if (user) {
          token.role = (user as { role?: string }).role;
          token.regionId = (user as { regionId?: string | null }).regionId ?? null;
          token.regionIds = (user as { regionIds?: string[] }).regionIds ?? [];
        }
        // Re-fetch the latest assigned regions from DB on session update so a
        // SUPER_ADMIN reassignment of an ADMIN takes effect on next request.
        if (trigger === 'update' && token.sub) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: {
                regionId: true,
                role: true,
                isActive: true,
                userRegions: { select: { regionId: true } },
              },
            });
            if (dbUser) {
              token.role = dbUser.role;
              token.regionId = dbUser.regionId ?? null;
              const seen = new Set<string>();
              const ids: string[] = [];
              if (dbUser.regionId) {
                seen.add(dbUser.regionId);
                ids.push(dbUser.regionId);
              }
              for (const ur of dbUser.userRegions) {
                if (!seen.has(ur.regionId)) {
                  seen.add(ur.regionId);
                  ids.push(ur.regionId);
                }
              }
              token.regionIds = ids;
            }
          } catch {
            // ignore – keep existing token claims
          }
        }
        return token;
      } catch (error) {
        console.error('NextAuth JWT callback error:', error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (token) {
          session.user.id = token.sub!;
          session.user.role = token.role as string;
          (session.user as { regionId?: string | null }).regionId =
            (token as { regionId?: string | null }).regionId ?? null;
          (session.user as { regionIds?: string[] }).regionIds =
            (token as { regionIds?: string[] }).regionIds ?? [];
        }
        return session;
      } catch (error) {
        console.error('NextAuth session callback error:', error);
        return session;
      }
    },
  },
  pages: {
    signIn: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth error:', code, metadata);
    },
    warn(code) {
      console.warn('NextAuth warning:', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth debug:', code, metadata);
      }
    }
  },
  events: {
    async signIn({ user }) {
      // Avoid logging the email/PII at info level. If you need login auditing
      // it should go through the activity log instead.
      console.info('NextAuth signIn for user id:', user.id);
    },
    async signOut() {
      console.info('NextAuth signOut');
    },
  }
}; 