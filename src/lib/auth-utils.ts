import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

// Define permissions for each role
const rolePermissions: Record<Role, Permission[]> = {
  USER: [
    { resource: 'customer', action: 'read' },
    { resource: 'customer.profile', action: 'update' },
    { resource: 'customer.rentals', action: 'read' },
    { resource: 'customer.payments', action: 'read' },
    { resource: 'customer.support', action: 'create' },
  ],
  VENDOR: [
    { resource: 'vendor', action: 'manage' },
    { resource: 'vendor.inventory', action: 'manage' },
    { resource: 'vendor.orders', action: 'manage' },
    { resource: 'vendor.payments', action: 'read' },
    { resource: 'vendor.profile', action: 'update' },
    { resource: 'customer', action: 'read' },
  ],
  ADMIN: [
    { resource: 'customer', action: 'manage' },
    { resource: 'inventory', action: 'manage' },
    { resource: 'financial', action: 'read' },
    { resource: 'reports', action: 'read' },
    { resource: 'vendor', action: 'read' },
    { resource: 'user', action: 'read' },
  ],
  SUPER_ADMIN: [
    { resource: '*', action: 'manage' }, // All permissions
  ],
};

/**
 * Get the current authenticated user from the server session
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }
  
  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name!,
    role: session.user.role as Role,
    isActive: true, // You might want to check this from database
  };
}

/**
 * Require authentication - throws error if user is not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }
  
  return user;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const permissions = rolePermissions[userRole] || [];
  
  // SUPER_ADMIN has all permissions
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  // Check for wildcard permission
  const wildcardPermission = permissions.find(p => p.resource === '*' && p.action === 'manage');
  if (wildcardPermission) {
    return true;
  }
  
  // Check for specific permission
  return permissions.some(p => 
    (p.resource === permission.resource || p.resource === '*') && 
    (p.action === permission.action || p.action === 'manage')
  );
}

/**
 * Require specific permission - throws error if user doesn't have permission
 */
export async function requirePermission(permission: Permission): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Insufficient permissions: ${permission.action} on ${permission.resource}`);
  }
  
  return user;
}

/**
 * Require specific role - throws error if user doesn't have required role
 */
export async function requireRole(requiredRole: Role): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  
  const roleHierarchy: Record<Role, Role[]> = {
    USER: ['USER'],
    VENDOR: ['VENDOR'],
    ADMIN: ['USER', 'ADMIN'],
    SUPER_ADMIN: ['USER', 'VENDOR', 'ADMIN', 'SUPER_ADMIN'],
  };
  
  const userRoles = roleHierarchy[user.role] || [];
  
  if (!userRoles.includes(requiredRole)) {
    throw new Error(`Insufficient role: ${requiredRole} required, but user has ${user.role}`);
  }
  
  return user;
}

/**
 * Check if user can access a specific resource
 */
export function canAccessResource(userRole: Role, resource: string, action: 'create' | 'read' | 'update' | 'delete' | 'manage' = 'read'): boolean {
  return hasPermission(userRole, { resource, action });
}

/**
 * Get user's accessible resources
 */
export function getAccessibleResources(userRole: Role): string[] {
  const permissions = rolePermissions[userRole] || [];
  
  if (userRole === 'SUPER_ADMIN') {
    return ['*']; // All resources
  }
  
  return [...new Set(permissions.map(p => p.resource))];
}

/**
 * Validate user session and return user info for API routes
 */
export async function validateApiRequest(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  
  // Additional validation for API requests
  if (!user.email || !user.name) {
    throw new Error('Invalid user session');
  }
  
  return user;
}

/**
 * Create a permission guard for React components
 */
export function createPermissionGuard(permission: Permission) {
  return async function PermissionGuard() {
    try {
      await requirePermission(permission);
      return true;
    } catch (error) {
      return false;
    }
  };
}

/**
 * Get user's dashboard URL based on role
 */
export function getDashboardUrl(userRole: Role): string {
  switch (userRole) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/dashboard';
    case 'USER':
      return '/customer/dashboard';
    case 'VENDOR':
      return '/vendor/dashboard';
    default:
      return '/login';
  }
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(userRole: Role): boolean {
  return canAccessResource(userRole, 'user', 'manage');
}

/**
 * Check if user can manage customers
 */
export function canManageCustomers(userRole: Role): boolean {
  return canAccessResource(userRole, 'customer', 'manage');
}

/**
 * Check if user can manage inventory
 */
export function canManageInventory(userRole: Role): boolean {
  return canAccessResource(userRole, 'inventory', 'manage');
}

/**
 * Check if user can view financial data
 */
export function canViewFinancial(userRole: Role): boolean {
  return canAccessResource(userRole, 'financial', 'read');
}

/**
 * Check if user can generate reports
 */
export function canGenerateReports(userRole: Role): boolean {
  return canAccessResource(userRole, 'reports', 'read');
}
