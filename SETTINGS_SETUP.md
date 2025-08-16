# Admin Settings Setup Guide

## Overview
The admin settings functionality allows administrators to manage system-wide business configuration including company information, business rules, and operational parameters.

## Features

### 🔧 Company Information
- Company name and branding
- Contact email and phone
- Business address
- Operating hours

### 💼 Business Configuration
- Delivery radius settings
- Default credit limits for customers
- Tax rate configuration
- Currency and timezone settings

### 🛠️ Maintenance & Safety
- Cylinder maintenance intervals
- Safety inspection schedules
- Equipment lifecycle management

## Database Schema

The settings are stored in the `SystemSettings` table with the following structure:

```sql
CREATE TABLE system_settings (
  id VARCHAR(255) PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(255) DEFAULT 'GENERAL',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Setup Instructions

### 1. Database Setup

First, ensure your PostgreSQL database is running and accessible:

```bash
# Check PostgreSQL status
systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql
```

### 2. Environment Configuration

Ensure your `.env` file contains the correct database connection:

```env
DATABASE_URL="postgresql://postgres:StrongPasswordHere@localhost:5432/lpg_gas_app?schema=public"
NEXTAUTH_SECRET="your-secret-key-here-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Migration

Run the following commands to set up the database:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Initialize with default settings
npm run db:init
```

### 4. Verify Installation

After setup, you should be able to:
- Access `/settings` page as an admin user
- View and edit system settings
- See real-time business statistics

## API Endpoints

### GET /api/settings
Retrieves all system settings (admin only)

**Response:**
```json
{
  "companyName": "LPG Gas Supply Co.",
  "contactEmail": "admin@lpg.com",
  "contactPhone": "+1 (555) 123-4567",
  "address": "123 Gas Street, Industrial District, City, State 12345",
  "businessHours": "Monday - Friday: 8AM - 6PM, Saturday: 9AM - 2PM",
  "deliveryRadius": 50,
  "defaultCreditLimit": 1000,
  "taxRate": 8.5,
  "currency": "USD",
  "timezone": "America/New_York",
  "maintenanceInterval": 90,
  "safetyInspectionInterval": 180,
  "totalCustomers": 25,
  "totalVendors": 8,
  "totalCylinders": 150
}
```

### PUT /api/settings
Updates system settings (admin only)

**Request Body:**
```json
{
  "companyName": "Updated Company Name",
  "contactEmail": "newemail@company.com",
  "deliveryRadius": 75,
  "taxRate": 9.0
}
```

**Response:**
```json
{
  "message": "Settings updated successfully",
  "settings": {
    "companyName": "Updated Company Name",
    "contactEmail": "newemail@company.com",
    "deliveryRadius": 75,
    "taxRate": 9.0
  }
}
```

## Validation Rules

### Required Fields
- `companyName` - Company name (non-empty string)
- `contactEmail` - Valid email format
- `contactPhone` - Phone number (non-empty string)

### Numeric Constraints
- `deliveryRadius` - Positive integer (miles)
- `defaultCreditLimit` - Positive number (currency)
- `taxRate` - Number between 0-100 (percentage)
- `maintenanceInterval` - Positive integer (days)
- `safetyInspectionInterval` - Positive integer (days)

### Format Validation
- Email addresses must follow standard email format
- Phone numbers should include country code
- Currency codes must be valid ISO currency codes
- Timezone must be valid IANA timezone identifier

## Usage Examples

### Updating Company Information
```javascript
const response = await fetch('/api/settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    companyName: 'New Company Name',
    contactEmail: 'contact@newcompany.com',
    address: '456 New Street, City, State'
  })
});
```

### Updating Business Rules
```javascript
const response = await fetch('/api/settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    deliveryRadius: 100,
    defaultCreditLimit: 2000,
    taxRate: 10.0
  })
});
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server-side errors

### Error Response Format
```json
{
  "error": "Validation Error",
  "message": "companyName is required"
}
```

## Security

### Access Control
- Only users with `ADMIN` or `SUPER_ADMIN` roles can access settings
- All API endpoints are protected by authentication middleware
- Settings changes are logged and auditable

### Data Validation
- Input sanitization and validation
- SQL injection prevention through Prisma ORM
- XSS protection through proper content encoding

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database `lpg_gas_app` exists

2. **Settings Not Loading**
   - Run `npm run db:init` to create default settings
   - Check browser console for errors
   - Verify user has admin permissions

3. **Settings Not Saving**
   - Check validation errors in API response
   - Verify all required fields are provided
   - Check database permissions

### Debug Commands

```bash
# Check database connection
npx prisma db push --preview-feature

# View database schema
npx prisma studio

# Reset database (WARNING: This will delete all data)
npx prisma migrate reset
```

## Integration with Other Features

### Customer Management
- Default credit limits from settings are applied to new customers
- Delivery radius affects customer service area calculations

### Financial System
- Tax rates from settings are used in invoice calculations
- Currency settings affect display and calculations

### Inventory Management
- Maintenance intervals trigger automatic maintenance scheduling
- Safety inspection intervals ensure compliance

## Best Practices

1. **Regular Backups** - Export settings before major changes
2. **Change Documentation** - Document all setting changes
3. **Testing** - Test settings changes in development first
4. **Audit Trail** - Review settings changes regularly
5. **Validation** - Always validate input data

## Support

For technical support or questions about the settings functionality:
- Check the application logs for error details
- Review the database schema and constraints
- Verify all required environment variables are set
- Ensure proper database permissions are configured 