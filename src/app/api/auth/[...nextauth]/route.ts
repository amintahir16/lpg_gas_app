import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

// Add error handling wrapper
const wrappedHandler = async (req: any, res: any) => {
  try {
    return await handler(req, res);
  } catch (error) {
    console.error('NextAuth API error:', error);
    return res.status(500).json({ error: 'Authentication service error' });
  }
};

export { wrappedHandler as GET, wrappedHandler as POST }; 