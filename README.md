# LPG Gas Cylinder Business Management System

A comprehensive, production-ready business management system for LPG gas cylinder distribution companies. Built with Next.js 14, TypeScript, PostgreSQL, and modern UI components.

## 🚀 Features

### 🔐 Authentication & Authorization
- **Role-based Access Control (RBAC)**: USER, ADMIN, SUPER_ADMIN roles
- **Secure Authentication**: NextAuth.js with JWT tokens
- **Permission-based Routes**: Middleware protection for all routes
- **Session Management**: Secure session handling with automatic refresh

### 👥 Customer Management
- **Customer Profiles**: Complete customer information management
- **Customer Types**: Residential, Commercial, Industrial
- **Credit Management**: Credit limits and payment tracking
- **Search & Filter**: Advanced search and filtering capabilities
- **Customer Ledger**: Transaction history and balance tracking

### 📦 Inventory Management
- **Cylinder Tracking**: Real-time cylinder status monitoring
- **Cylinder Types**: 15kg and 45kg cylinder support
- **Maintenance Scheduling**: Automated maintenance reminders
- **Location Tracking**: Cylinder location management
- **Status Management**: Available, Rented, Maintenance, Retired

### 💰 Financial Management
- **Invoice Generation**: Automated invoice creation
- **Payment Tracking**: Payment history and status
- **Expense Management**: Business expense tracking
- **Financial Reports**: Revenue and profit analytics
- **Tax Calculations**: Automatic tax computation

### 🏢 Vendor Management
- **Vendor Profiles**: Complete vendor information
- **Order Management**: Purchase order tracking
- **Payment Terms**: Flexible payment term management
- **Vendor Support**: Support request system

### 📊 Analytics & Reporting
- **Dashboard Analytics**: Real-time business metrics
- **Custom Reports**: Generate custom business reports
- **Data Export**: Export data in multiple formats
- **Performance Metrics**: Key performance indicators

### 📱 Responsive Design
- **Mobile-First**: Optimized for all device sizes
- **Modern UI**: Professional, clean interface
- **Accessibility**: WCAG compliant design
- **Dark Mode Ready**: Theme support (coming soon)

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Heroicons**: Beautiful SVG icons
- **React Hook Form**: Form management
- **Zod**: Schema validation

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Prisma ORM**: Database abstraction layer
- **PostgreSQL**: Primary database
- **NextAuth.js**: Authentication framework
- **bcryptjs**: Password hashing

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Prisma Studio**: Database GUI

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v12 or higher)
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd lpg-gas-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/lpg_gas_app"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: For production
NEXTAUTH_URL="https://your-domain.com"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Create demo user
node scripts/create-demo-user.js
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔐 Default Credentials

After running the setup script, you can log in with:
- **Email**: `admin@lpg.com`
- **Password**: `admin123`

## 📁 Project Structure

```
lpg-gas-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Dashboard routes
│   │   ├── (customer)/        # Customer portal routes
│   │   ├── (vendor)/          # Vendor portal routes
│   │   ├── api/               # API routes
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable components
│   │   ├── ui/               # Base UI components
│   │   ├── layouts/          # Layout components
│   │   └── forms/            # Form components
│   ├── lib/                  # Utility libraries
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── auth-utils.ts     # Role-based access control
│   │   ├── db.ts             # Database connection
│   │   └── utils.ts          # General utilities
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript type definitions
├── prisma/                   # Database schema and migrations
├── public/                   # Static assets
├── scripts/                  # Utility scripts
└── middleware.ts             # Next.js middleware
```

## 🔧 Configuration

### Database Configuration
The application uses PostgreSQL with Prisma ORM. Configure your database connection in the `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### Authentication Configuration
NextAuth.js is configured for credential-based authentication. Configure in `.env`:

```env
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Role-Based Access Control
The system implements three user roles:

1. **USER**: Customer access to their own data
2. **ADMIN**: Full business management access
3. **SUPER_ADMIN**: Complete system access

## 🚀 Production Deployment

### 1. Build the Application
```bash
npm run build
```

### 2. Environment Variables
Set up production environment variables:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://your-domain.com"
```

### 3. Database Migration
```bash
npx prisma migrate deploy
```

### 4. Start Production Server
```bash
npm start
```

### Deployment Platforms
- **Vercel**: Recommended for Next.js applications
- **Railway**: Easy PostgreSQL + Next.js deployment
- **DigitalOcean**: App Platform deployment
- **AWS**: ECS or EC2 deployment

## 🔒 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure session management
- **CSRF Protection**: Built-in Next.js protection
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Prisma ORM protection
- **XSS Protection**: React built-in protection
- **Rate Limiting**: API rate limiting (implement as needed)

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session

### Customer Endpoints
- `GET /api/customers` - Get customers (with pagination)
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer details
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer

### Inventory Endpoints
- `GET /api/inventory` - Get inventory status
- `POST /api/inventory/cylinders` - Add cylinder
- `PUT /api/inventory/cylinders/[id]` - Update cylinder

### Financial Endpoints
- `GET /api/financial/expenses` - Get expenses
- `POST /api/financial/expenses` - Add expense
- `GET /api/financial/reports` - Get financial reports

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Complete CRUD operations for all entities
- Role-based access control
- Professional UI/UX design
- Production-ready architecture

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma team for the excellent ORM
- Tailwind CSS for the utility-first CSS framework
- Heroicons for the beautiful icons

---

**Built with ❤️ for LPG Gas Cylinder Businesses**
