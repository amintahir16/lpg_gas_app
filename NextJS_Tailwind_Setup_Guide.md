# Next.js & Tailwind CSS Setup Guide for LPG Gas Cylinder Business App

## 🚀 Quick Start

### 1. Create Next.js Project
```bash
# Create new Next.js project with TypeScript and Tailwind CSS
npx create-next-app@latest lpg-gas-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Navigate to project directory
cd lpg-gas-app
```

### 2. Install Additional Dependencies
```bash
# UI Components and Icons
npm install @headlessui/react @heroicons/react lucide-react

# State Management and Data Fetching
npm install zustand @tanstack/react-query

# Forms and Validation
npm install react-hook-form @hookform/resolvers zod

# Authentication
npm install next-auth @auth/prisma-adapter

# Database
npm install prisma @prisma/client

# Utilities
npm install clsx tailwind-merge
npm install react-hot-toast
npm install recharts
npm install date-fns

# Development Dependencies
npm install -D @types/node @types/react @types/react-dom
npm install -D prettier prettier-plugin-tailwindcss
npm install -D @tailwindcss/forms @tailwindcss/typography
```

## 📁 Project Structure

```
lpg-gas-app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── inventory/
│   │   │   │   └── page.tsx
│   │   │   ├── financial/
│   │   │   │   └── page.tsx
│   │   │   └── reports/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── customers/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── inventory/
│   │   │   │   └── route.ts
│   │   │   └── financial/
│   │   │       └── route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   └── modal.tsx
│   │   ├── forms/
│   │   │   ├── customer-form.tsx
│   │   │   └── inventory-form.tsx
│   │   ├── layouts/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── dashboard-layout.tsx
│   │   └── providers/
│   │       ├── auth-provider.tsx
│   │       └── query-provider.tsx
│   ├── lib/
│   │   ├── utils.ts
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── validations.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-customers.ts
│   │   └── use-inventory.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── customer.ts
│   │   └── inventory.ts
│   └── styles/
│       └── components.css
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   ├── images/
│   └── icons/
├── tailwind.config.ts
├── next.config.js
├── package.json
└── README.md
```

## 🎨 Tailwind CSS Configuration

### 1. Update tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

### 2. Update globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200;
  }
  
  .btn-secondary {
    @apply bg-secondary-200 hover:bg-secondary-300 text-secondary-900 font-medium py-2 px-4 rounded-lg transition-colors duration-200;
  }
  
  .input-field {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  }
}
```

## 🗄️ Database Setup with Prisma

### 1. Initialize Prisma
```bash
npx prisma init
```

### 2. Configure schema.prisma
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
  password  String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  customers    Customer[]
  expenses     Expense[]
  invoices     Invoice[]
  cylinderRentals CylinderRental[]

  @@map("users")
}

model Customer {
  id          String   @id @default(cuid())
  code        String   @unique
  firstName   String
  lastName    String
  email       String?
  phone       String
  address     String?
  city        String?
  state       String?
  postalCode  String?
  customerType CustomerType
  creditLimit Decimal  @default(0) @db.Decimal(10, 2)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  user           User             @relation(fields: [userId], references: [id])
  userId         String
  ledger         CustomerLedger[]
  cylinderRentals CylinderRental[]

  @@map("customers")
}

model Cylinder {
  id                    String         @id @default(cuid())
  code                  String         @unique
  cylinderType          CylinderType
  capacity              Decimal        @db.Decimal(5, 2)
  purchaseDate          DateTime?
  purchasePrice         Decimal?       @db.Decimal(10, 2)
  currentStatus         CylinderStatus @default(AVAILABLE)
  location              String?
  lastMaintenanceDate   DateTime?
  nextMaintenanceDate   DateTime?
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  // Relations
  cylinderRentals CylinderRental[]

  @@map("cylinders")
}

model CustomerLedger {
  id              String           @id @default(cuid())
  customer        Customer         @relation(fields: [customerId], references: [id])
  customerId      String
  transactionType TransactionType
  amount          Decimal          @db.Decimal(10, 2)
  balanceBefore   Decimal          @db.Decimal(10, 2)
  balanceAfter    Decimal          @db.Decimal(10, 2)
  description     String?
  invoiceId       String?
  createdAt       DateTime         @default(now())

  @@map("customer_ledger")
}

model CylinderRental {
  id                String    @id @default(cuid())
  customer          Customer  @relation(fields: [customerId], references: [id])
  customerId        String
  cylinder          Cylinder  @relation(fields: [cylinderId], references: [id])
  cylinderId        String
  user              User      @relation(fields: [userId], references: [id])
  userId            String
  rentalDate        DateTime
  expectedReturnDate DateTime?
  actualReturnDate  DateTime?
  rentalAmount      Decimal?  @db.Decimal(10, 2)
  depositAmount     Decimal?  @db.Decimal(10, 2)
  status            RentalStatus @default(ACTIVE)
  notes             String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@map("cylinder_rentals")
}

model Expense {
  id          String       @id @default(cuid())
  category    ExpenseCategory
  amount      Decimal      @db.Decimal(10, 2)
  description String?
  expenseDate DateTime
  receiptUrl  String?
  user        User         @relation(fields: [userId], references: [id])
  userId      String
  createdAt   DateTime     @default(now())

  @@map("expenses")
}

model Vendor {
  id            String   @id @default(cuid())
  vendorCode    String   @unique
  companyName   String
  contactPerson String?
  email         String?
  phone         String?
  address       String?
  taxId         String?
  paymentTerms  Int      @default(30)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  invoices Invoice[]

  @@map("vendors")
}

model Invoice {
  id            String      @id @default(cuid())
  invoiceNumber String      @unique
  customerId    String?
  vendorId      String?
  invoiceType   InvoiceType
  totalAmount   Decimal     @db.Decimal(10, 2)
  taxAmount     Decimal     @default(0) @db.Decimal(10, 2)
  discountAmount Decimal    @default(0) @db.Decimal(10, 2)
  finalAmount   Decimal     @db.Decimal(10, 2)
  status        InvoiceStatus @default(DRAFT)
  dueDate       DateTime?
  paidDate      DateTime?
  notes         String?
  user          User        @relation(fields: [userId], references: [id])
  userId        String
  vendor        Vendor?     @relation(fields: [vendorId], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@map("invoices")
}

// Enums
enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}

enum CustomerType {
  RESIDENTIAL
  COMMERCIAL
  INDUSTRIAL
}

enum CylinderType {
  KG_15
  KG_45
}

enum CylinderStatus {
  AVAILABLE
  RENTED
  MAINTENANCE
  RETIRED
}

enum TransactionType {
  SALE
  PAYMENT
  REFUND
  ADJUSTMENT
}

enum RentalStatus {
  ACTIVE
  RETURNED
  OVERDUE
}

enum ExpenseCategory {
  SALARY
  FUEL
  MEALS
  MAINTENANCE
  UTILITIES
  OTHER
}

enum InvoiceType {
  SALE
  PURCHASE
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  CANCELLED
}
```

### 3. Generate Prisma Client
```bash
npx prisma generate
npx prisma db push
```

## 🔐 Authentication Setup with NextAuth.js

### 1. Create NextAuth Configuration
```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
```

### 2. Create NextAuth API Route
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

## 🎯 Component Examples

### 1. Button Component
```typescript
// src/components/ui/button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### 2. Input Component
```typescript
// src/components/ui/input.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
```

### 3. Customer Form Component
```typescript
// src/components/forms/customer-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';

const customerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  customerType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL']),
  creditLimit: z.number().min(0, 'Credit limit must be positive'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  onSubmit: (data: CustomerFormData) => Promise<void>;
  initialData?: Partial<CustomerFormData>;
}

export function CustomerForm({ onSubmit, initialData }: CustomerFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData,
  });

  const handleFormSubmit = async (data: CustomerFormData) => {
    try {
      setIsLoading(true);
      await onSubmit(data);
      toast.success('Customer saved successfully!');
      reset();
    } catch (error) {
      toast.error('Failed to save customer');
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First Name *
          </label>
          <Input
            id="firstName"
            {...register('firstName')}
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last Name *
          </label>
          <Input
            id="lastName"
            {...register('lastName')}
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone *
          </label>
          <Input
            id="phone"
            {...register('phone')}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Address
        </label>
        <Input
          id="address"
          {...register('address')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City
          </label>
          <Input
            id="city"
            {...register('city')}
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State
          </label>
          <Input
            id="state"
            {...register('state')}
          />
        </div>

        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
            Postal Code
          </label>
          <Input
            id="postalCode"
            {...register('postalCode')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="customerType" className="block text-sm font-medium text-gray-700">
            Customer Type *
          </label>
          <select
            id="customerType"
            {...register('customerType')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="INDUSTRIAL">Industrial</option>
          </select>
        </div>

        <div>
          <label htmlFor="creditLimit" className="block text-sm font-medium text-gray-700">
            Credit Limit
          </label>
          <Input
            id="creditLimit"
            type="number"
            step="0.01"
            {...register('creditLimit', { valueAsNumber: true })}
            className={errors.creditLimit ? 'border-red-500' : ''}
          />
          {errors.creditLimit && (
            <p className="mt-1 text-sm text-red-600">{errors.creditLimit.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Customer'}
        </Button>
      </div>
    </form>
  );
}
```

## 🚀 Deployment

### 1. Environment Variables
Create `.env.local` file:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/lpg_gas_app"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# File Storage (optional)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-s3-bucket"
```

### 2. Build and Deploy
```bash
# Build the application
npm run build

# Start production server
npm start

# Or deploy to Vercel
npx vercel --prod
```

## 📱 Mobile App Setup

### 1. Create React Native App
```bash
npx react-native init LPGMobileApp --template react-native-template-typescript
cd LPGMobileApp
```

### 2. Install Dependencies
```bash
npm install @react-navigation/native @react-navigation/stack
npm install react-native-camera react-native-qrcode-scanner
npm install @react-native-async-storage/async-storage
npm install react-native-vector-icons
npm install react-native-elements
```

### 3. Configure for LPG Gas App
```typescript
// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CustomerScreen from './src/screens/CustomerScreen';
import InventoryScreen from './src/screens/InventoryScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Customer" component={CustomerScreen} />
          <Stack.Screen name="Inventory" component={InventoryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

## 🎯 Key Benefits of This Setup

### Next.js Benefits:
- **Server-Side Rendering**: Better SEO and performance
- **API Routes**: Built-in backend functionality
- **File-based Routing**: Simple and intuitive
- **TypeScript Support**: Type safety throughout
- **Image Optimization**: Automatic image optimization
- **Middleware Support**: Request/response modification

### Tailwind CSS Benefits:
- **Utility-First**: Rapid UI development
- **Responsive Design**: Built-in responsive utilities
- **Customizable**: Easy theme customization
- **Performance**: Purged CSS for optimal bundle size
- **Consistency**: Design system with consistent spacing

### Prisma Benefits:
- **Type Safety**: Auto-generated TypeScript types
- **Database Agnostic**: Easy to switch databases
- **Migration System**: Version-controlled schema changes
- **Query Builder**: Type-safe database queries
- **Relations**: Easy relationship management

This setup provides a modern, scalable, and maintainable foundation for your LPG Gas Cylinder Business App with excellent developer experience and performance. 