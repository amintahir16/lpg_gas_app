# API Specification Documentation - LPG Gas Cylinder Business App

## Table of Contents
1. [Overview](#overview)
2. [API Architecture](#api-architecture)
3. [Authentication & Authorization](#authentication--authorization)
4. [Base URL & Endpoints](#base-url--endpoints)
5. [Request/Response Format](#requestresponse-format)
6. [Error Handling](#error-handling)
7. [API Endpoints](#api-endpoints)
8. [Data Models](#data-models)
9. [Rate Limiting](#rate-limiting)
10. [Testing](#testing)
11. [Documentation](#documentation)

## Overview

The LPG Gas Cylinder Business App API is built using **Next.js API Routes** with TypeScript, providing a RESTful interface for managing customers, inventory, financial data, and business operations. The API follows REST principles and includes comprehensive authentication, validation, and error handling.

## API Architecture

### Technology Stack
- **Framework**: Next.js 14 API Routes
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **Validation**: Zod schemas
- **Error Handling**: Custom error classes
- **Documentation**: OpenAPI/Swagger

### API Structure
```
src/app/api/
├── auth/
│   └── [...nextauth]/
│       └── route.ts
├── customers/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── ledger/
│           └── route.ts
├── inventory/
│   ├── route.ts
│   └── cylinders/
│       └── route.ts
├── financial/
│   ├── expenses/
│   │   └── route.ts
│   ├── profit/
│   │   └── route.ts
│   └── reports/
│       └── route.ts
├── vendors/
│   ├── route.ts
│   └── [id]/
│       └── route.ts
└── health/
    └── route.ts
```

## Authentication & Authorization

### JWT Token Structure
```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  name: string;       // User name
  role: UserRole;     // User role
  iat: number;        // Issued at
  exp: number;        // Expiration time
}

enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}
```

### Authentication Flow
1. **Login**: POST `/api/auth/signin`
2. **Session Validation**: Automatic via NextAuth.js
3. **Token Refresh**: Automatic via NextAuth.js
4. **Logout**: POST `/api/auth/signout`

### Authorization Middleware
```typescript
// src/lib/auth.ts
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  return session;
}

export async function requireRole(requiredRole: UserRole) {
  const session = await requireAuth();
  
  if (session.user.role !== requiredRole && session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Insufficient permissions');
  }
  
  return session;
}
```

## Base URL & Endpoints

### Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

### API Versioning
- **Current Version**: v1
- **URL Pattern**: `/api/v1/{resource}`
- **Headers**: `Accept: application/json`

## Request/Response Format

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer {jwt_token}
Accept: application/json
X-Request-ID: {unique_request_id}
```

### Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
```

### Success Response Example
```json
{
  "success": true,
  "data": {
    "id": "cust_123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "message": "Customer retrieved successfully"
}
```

### Error Response Example
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "First name is required",
    "Email must be a valid email address"
  ]
}
```

## Error Handling

### Error Types
```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ValidationError extends ApiError {
  constructor(message: string, errors: string[]) {
    super(400, message, errors);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(401, message);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}
```

### Error Handler
```typescript
// src/lib/api-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from './errors';

export function apiHandler(handler: Function) {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof ApiError) {
        return NextResponse.json(
          {
            success: false,
            message: error.message,
            errors: error.errors,
          },
          { status: error.statusCode }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          message: 'Internal server error',
        },
        { status: 500 }
      );
    }
  };
}
```

## API Endpoints

### 1. Authentication Endpoints

#### POST /api/auth/signin
**Description**: User login
```typescript
// Request Body
interface SignInRequest {
  email: string;
  password: string;
}

// Response
interface SignInResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
    session: {
      accessToken: string;
      refreshToken: string;
    };
  };
}
```

#### POST /api/auth/signup
**Description**: User registration
```typescript
// Request Body
interface SignUpRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

// Response
interface SignUpResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  };
}
```

#### POST /api/auth/signout
**Description**: User logout
```typescript
// Response
interface SignOutResponse {
  success: boolean;
  message: string;
}
```

### 2. Customer Endpoints

#### GET /api/customers
**Description**: Get all customers with pagination
```typescript
// Query Parameters
interface CustomerListQuery {
  page?: number;        // Default: 1
  limit?: number;       // Default: 10, Max: 100
  search?: string;      // Search by name, email, or phone
  customerType?: CustomerType;
  isActive?: boolean;
  sortBy?: 'name' | 'createdAt' | 'customerType';
  sortOrder?: 'asc' | 'desc';
}

// Response
interface CustomerListResponse {
  success: boolean;
  data: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### POST /api/customers
**Description**: Create a new customer
```typescript
// Request Body
interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  customerType: CustomerType;
  creditLimit?: number;
}

// Response
interface CreateCustomerResponse {
  success: boolean;
  data: Customer;
  message: string;
}
```

#### GET /api/customers/[id]
**Description**: Get customer by ID
```typescript
// Response
interface CustomerResponse {
  success: boolean;
  data: Customer & {
    ledger: CustomerLedger[];
    cylinderRentals: CylinderRental[];
  };
}
```

#### PUT /api/customers/[id]
**Description**: Update customer
```typescript
// Request Body
interface UpdateCustomerRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  customerType?: CustomerType;
  creditLimit?: number;
  isActive?: boolean;
}
```

#### DELETE /api/customers/[id]
**Description**: Delete customer (soft delete)
```typescript
// Response
interface DeleteCustomerResponse {
  success: boolean;
  message: string;
}
```

#### GET /api/customers/[id]/ledger
**Description**: Get customer ledger
```typescript
// Query Parameters
interface LedgerQuery {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  transactionType?: TransactionType;
}

// Response
interface CustomerLedgerResponse {
  success: boolean;
  data: {
    customer: Customer;
    ledger: CustomerLedger[];
    summary: {
      totalBalance: number;
      totalDebit: number;
      totalCredit: number;
    };
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 3. Inventory Endpoints

#### GET /api/inventory
**Description**: Get inventory summary
```typescript
// Response
interface InventorySummaryResponse {
  success: boolean;
  data: {
    totalCylinders: number;
    availableCylinders: number;
    rentedCylinders: number;
    maintenanceCylinders: number;
    byType: {
      '15kg': {
        total: number;
        available: number;
        rented: number;
        maintenance: number;
      };
      '45kg': {
        total: number;
        available: number;
        rented: number;
        maintenance: number;
      };
    };
  };
}
```

#### GET /api/inventory/cylinders
**Description**: Get cylinders with filters
```typescript
// Query Parameters
interface CylinderListQuery {
  page?: number;
  limit?: number;
  cylinderType?: CylinderType;
  status?: CylinderStatus;
  location?: string;
  search?: string;
}

// Response
interface CylinderListResponse {
  success: boolean;
  data: Cylinder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### POST /api/inventory/cylinders
**Description**: Add new cylinder
```typescript
// Request Body
interface CreateCylinderRequest {
  code: string;
  cylinderType: CylinderType;
  capacity: number;
  purchaseDate?: string;
  purchasePrice?: number;
  location?: string;
}
```

#### PUT /api/inventory/cylinders/[id]
**Description**: Update cylinder
```typescript
// Request Body
interface UpdateCylinderRequest {
  code?: string;
  cylinderType?: CylinderType;
  capacity?: number;
  currentStatus?: CylinderStatus;
  location?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}
```

### 4. Financial Endpoints

#### GET /api/financial/expenses
**Description**: Get expenses with filters
```typescript
// Query Parameters
interface ExpenseListQuery {
  page?: number;
  limit?: number;
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

// Response
interface ExpenseListResponse {
  success: boolean;
  data: Expense[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### POST /api/financial/expenses
**Description**: Create expense
```typescript
// Request Body
interface CreateExpenseRequest {
  category: ExpenseCategory;
  amount: number;
  description?: string;
  expenseDate: string;
  receiptUrl?: string;
}
```

#### GET /api/financial/profit
**Description**: Get profit analysis
```typescript
// Query Parameters
interface ProfitQuery {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
}

// Response
interface ProfitResponse {
  success: boolean;
  data: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    breakdown: {
      date: string;
      revenue: number;
      expenses: number;
      profit: number;
    }[];
  };
}
```

#### GET /api/financial/reports
**Description**: Get financial reports
```typescript
// Query Parameters
interface ReportQuery {
  reportType: 'sales' | 'expenses' | 'profit' | 'inventory';
  startDate: string;
  endDate: string;
  format?: 'json' | 'csv' | 'pdf';
}

// Response
interface ReportResponse {
  success: boolean;
  data: {
    report: any;
    generatedAt: string;
    period: string;
  };
}
```

### 5. Vendor Endpoints

#### GET /api/vendors
**Description**: Get all vendors
```typescript
// Query Parameters
interface VendorListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

// Response
interface VendorListResponse {
  success: boolean;
  data: Vendor[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### POST /api/vendors
**Description**: Create vendor
```typescript
// Request Body
interface CreateVendorRequest {
  vendorCode: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: number;
}
```

#### GET /api/vendors/[id]
**Description**: Get vendor by ID
```typescript
// Response
interface VendorResponse {
  success: boolean;
  data: Vendor & {
    invoices: Invoice[];
  };
}
```

### 6. Health Check Endpoint

#### GET /api/health
**Description**: API health check
```typescript
// Response
interface HealthResponse {
  success: boolean;
  data: {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    database: {
      status: 'connected' | 'disconnected';
      responseTime: number;
    };
    redis: {
      status: 'connected' | 'disconnected';
      responseTime: number;
    };
  };
}
```

## Data Models

### Customer Model
```typescript
interface Customer {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  customerType: CustomerType;
  creditLimit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

enum CustomerType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL'
}
```

### Cylinder Model
```typescript
interface Cylinder {
  id: string;
  code: string;
  cylinderType: CylinderType;
  capacity: number;
  purchaseDate?: string;
  purchasePrice?: number;
  currentStatus: CylinderStatus;
  location?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  createdAt: string;
  updatedAt: string;
}

enum CylinderType {
  KG_15 = '15kg',
  KG_45 = '45kg'
}

enum CylinderStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED'
}
```

### Customer Ledger Model
```typescript
interface CustomerLedger {
  id: string;
  customerId: string;
  transactionType: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  invoiceId?: string;
  createdAt: string;
}

enum TransactionType {
  SALE = 'SALE',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT'
}
```

### Expense Model
```typescript
interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  expenseDate: string;
  receiptUrl?: string;
  userId: string;
  createdAt: string;
}

enum ExpenseCategory {
  SALARY = 'SALARY',
  FUEL = 'FUEL',
  MEALS = 'MEALS',
  MAINTENANCE = 'MAINTENANCE',
  UTILITIES = 'UTILITIES',
  OTHER = 'OTHER'
}
```

## Rate Limiting

### Rate Limit Configuration
```typescript
// src/lib/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export async function rateLimit(
  request: NextRequest,
  limit: number = 100,
  window: number = 60
) {
  const ip = request.ip || 'unknown';
  const key = `rate_limit:${ip}`;
  
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, window);
  }
  
  if (current > limit) {
    return NextResponse.json(
      {
        success: false,
        message: 'Rate limit exceeded',
      },
      { status: 429 }
    );
  }
  
  return null;
}
```

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Testing

### API Testing with Jest
```typescript
// __tests__/api/customers.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/customers/route';

describe('/api/customers', () => {
  test('GET returns customers list', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        page: '1',
        limit: '10',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toMatchObject({
      success: true,
      data: expect.any(Array),
    });
  });

  test('POST creates new customer', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        customerType: 'RESIDENTIAL',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData())).toMatchObject({
      success: true,
      data: expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
      }),
    });
  });
});
```

### Integration Testing
```typescript
// __tests__/integration/customer-flow.test.ts
import { test, expect } from '@playwright/test';

test('complete customer management flow', async ({ request }) => {
  // Create customer
  const createResponse = await request.post('/api/customers', {
    data: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '+1234567890',
      customerType: 'COMMERCIAL',
    },
  });
  
  expect(createResponse.ok()).toBeTruthy();
  const customer = await createResponse.json();
  
  // Get customer
  const getResponse = await request.get(`/api/customers/${customer.data.id}`);
  expect(getResponse.ok()).toBeTruthy();
  
  // Update customer
  const updateResponse = await request.put(`/api/customers/${customer.data.id}`, {
    data: {
      creditLimit: 5000,
    },
  });
  expect(updateResponse.ok()).toBeTruthy();
  
  // Delete customer
  const deleteResponse = await request.delete(`/api/customers/${customer.data.id}`);
  expect(deleteResponse.ok()).toBeTruthy();
});
```

## Documentation

### OpenAPI/Swagger Specification
```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: LPG Gas Cylinder Business App API
  version: 1.0.0
  description: API for managing LPG gas cylinder business operations

servers:
  - url: http://localhost:3000/api
    description: Development server
  - url: https://your-domain.com/api
    description: Production server

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Customer:
      type: object
      properties:
        id:
          type: string
        firstName:
          type: string
        lastName:
          type: string
        email:
          type: string
          format: email
        phone:
          type: string
        customerType:
          type: string
          enum: [RESIDENTIAL, COMMERCIAL, INDUSTRIAL]

paths:
  /customers:
    get:
      summary: Get all customers
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      responses:
        '200':
          description: List of customers
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Customer'
```

### API Documentation Tools
- **Swagger UI**: Interactive API documentation
- **Postman Collection**: Import/export API requests
- **Insomnia**: API testing and documentation
- **Redoc**: Alternative documentation viewer

This comprehensive API specification documentation provides a complete guide for implementing and consuming the LPG Gas Cylinder Business App API, including authentication, endpoints, data models, error handling, testing, and documentation standards. 