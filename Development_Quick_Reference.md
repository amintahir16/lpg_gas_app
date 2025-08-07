# LPG Gas Cylinder Business App - Development Quick Reference

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ or Python 3.9+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose

### Project Structure
```
lpg-gas-app/
├── src/                      # Next.js application
│   ├── app/                  # App Router
│   ├── components/           # React components
│   ├── lib/                  # Utilities
│   └── types/                # TypeScript types
├── prisma/                   # Database schema
├── mobile/                   # React Native app
├── docs/                     # Documentation
└── docker-compose.yml        # Development environment
```

## 📋 Core Features Checklist

### Phase 1: MVP (Weeks 1-8)
- [ ] User authentication & authorization
- [ ] Customer CRUD operations
- [ ] Basic inventory management
- [ ] Simple financial recording
- [ ] Database setup

### Phase 2: Business Logic (Weeks 9-16)
- [ ] Customer ledger management
- [ ] Cylinder rental system
- [ ] Vendor management
- [ ] Expense tracking
- [ ] Invoice generation

### Phase 3: Advanced Features (Weeks 17-24)
- [ ] Mobile application
- [ ] Reporting & analytics
- [ ] Communication system
- [ ] Third-party integrations

## 🛠 Technology Stack

### Frontend
```bash
# Next.js with TypeScript and Tailwind CSS
npx create-next-app@latest lpg-gas-app --typescript --tailwind --eslint
cd lpg-gas-app
npm install @headlessui/react @heroicons/react
npm install zustand @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod
npm install next-auth @prisma/client
npm install recharts react-hot-toast
```

### Backend
```bash
# Next.js API Routes with Prisma
npm install prisma @prisma/client
npm install next-auth
npm install bcryptjs jsonwebtoken
npm install nodemailer twilio
npm install zod @hookform/resolvers
npm install @types/bcryptjs @types/jsonwebtoken

# Initialize Prisma
npx prisma init
npx prisma generate
npx prisma db push
```

### Database
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Customer {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  email     String?
  phone     String
  // ... other fields
}

enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}
```

## 🔐 Security Implementation

### Authentication
```typescript
// NextAuth.js implementation
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      // ... credentials config
    }),
  ],
  session: {
    strategy: 'jwt',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Password Hashing
```javascript
// bcrypt implementation
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash(password, 12);
```

### API Security
```typescript
// Next.js middleware for API protection
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  if (!token && request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

## 📊 Database Schema Highlights

### Key Relationships
- **Customer** → **Customer Ledger** (One-to-Many)
- **Customer** → **Cylinder Rentals** (One-to-Many)
- **Cylinder** → **Cylinder Rentals** (One-to-Many)
- **User** → **Transactions** (One-to-Many)

### Important Indexes
```sql
CREATE INDEX idx_customer_phone ON customers(phone);
CREATE INDEX idx_cylinder_status ON cylinders(current_status);
CREATE INDEX idx_ledger_customer_date ON customer_ledger(customer_id, created_at);
CREATE INDEX idx_rentals_customer ON cylinder_rentals(customer_id);
```

## 🔄 API Endpoints Structure

### Authentication
```
POST /api/auth/signin
POST /api/auth/signup
GET  /api/auth/session
POST /api/auth/signout
```

### Customers
```
GET    /api/customers
POST   /api/customers
GET    /api/customers/[id]
PUT    /api/customers/[id]
DELETE /api/customers/[id]
GET    /api/customers/[id]/ledger
```

### Inventory
```
GET    /api/inventory
POST   /api/inventory
GET    /api/inventory/cylinders
PUT    /api/inventory/cylinders/[id]
GET    /api/inventory/status
```

### Financial
```
GET    /api/financial/expenses
POST   /api/financial/expenses
GET    /api/financial/profit
GET    /api/financial/reports
```

## 📱 Mobile App Features

### Core Mobile Features
- Customer lookup
- Cylinder scanning (QR/Barcode)
- Payment collection
- Offline data sync
- Location tracking

### React Native Setup
```bash
npx react-native init LPGMobileApp
npm install @react-navigation/native
npm install react-native-camera
npm install @react-native-async-storage/async-storage
```

## 🔧 Development Environment

### Docker Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: lpg_gas_app
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
  
  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
  
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://admin:password@postgres:5432/lpg_gas_app
```

### Environment Variables
```bash
# .env.local
DATABASE_URL="postgresql://admin:password@localhost:5432/lpg_gas_app"
NEXTAUTH_SECRET="your-super-secret-nextauth-key"
NEXTAUTH_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## 📈 Testing Strategy

### Unit Tests
```javascript
// Jest configuration for Next.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### API Tests
```typescript
// Testing Next.js API routes
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/customers/route';

describe('Customer API', () => {
  test('GET /api/customers should return customers', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
  });
});
```

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Database migrations ready
- [ ] Environment variables configured

### Production Setup
- [ ] SSL certificates installed
- [ ] Database backups configured
- [ ] Monitoring tools setup
- [ ] CI/CD pipeline configured
- [ ] Error tracking enabled

## 📊 Performance Optimization

### Database Optimization
- Use connection pooling
- Implement query caching
- Add proper indexes
- Regular database maintenance

### Frontend Optimization
- Code splitting
- Lazy loading
- Image optimization
- Bundle size optimization

### API Optimization
- Response caching
- Pagination
- Rate limiting
- Compression

## 🔍 Monitoring & Logging

### Application Monitoring
```typescript
// Next.js logging with console and external services
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Log request
    console.log(`[${new Date().toISOString()}] GET /api/customers`);
    
    // Your logic here
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### Health Checks
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
}
```

## 🆘 Common Issues & Solutions

### Database Connection Issues
```typescript
// Prisma connection with retry logic
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Connection test
export async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}
```

### NextAuth Session Issues
```typescript
// NextAuth session management
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const login = async (credentials: any) => {
    const result = await signIn('credentials', {
      ...credentials,
      redirect: false,
    });
    
    if (result?.error) {
      throw new Error(result.error);
    }
    
    router.push('/dashboard');
  };

  const logout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return { session, status, login, logout };
}
```

## 📚 Additional Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Useful Libraries
- **Frontend**: Tailwind CSS, Headless UI, React Hook Form
- **Backend**: Next.js API Routes, Prisma, Zod (validation)
- **Testing**: Jest, React Testing Library, Playwright
- **Deployment**: Vercel, Docker, Nginx

### Code Quality Tools
- **Linting**: ESLint, Prettier
- **Type Checking**: TypeScript
- **Git Hooks**: Husky, lint-staged
- **Code Coverage**: Istanbul

---

**Remember**: Start with MVP, focus on core features, and iterate based on user feedback. Security and data integrity should always be top priorities. 