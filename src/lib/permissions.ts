export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  SALES = 'SALES',
  VIEWER = 'VIEWER'
}

export interface Permission {
  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  canCreateSales: boolean;
  canCreatePayments: boolean;
  canCreateReturns: boolean;
  canCreateBuybacks: boolean;
  canVoidTransactions: boolean;
  canViewReports: boolean;
  canEditSettings: boolean;
  canApproveOverrides: boolean;
  canExportData: boolean;
}

export const rolePermissions: Record<UserRole, Permission> = {
  [UserRole.ADMIN]: {
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canCreateSales: true,
    canCreatePayments: true,
    canCreateReturns: true,
    canCreateBuybacks: true,
    canVoidTransactions: true,
    canViewReports: true,
    canEditSettings: true,
    canApproveOverrides: true,
    canExportData: true,
  },
  [UserRole.MANAGER]: {
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,
    canCreateSales: true,
    canCreatePayments: true,
    canCreateReturns: true,
    canCreateBuybacks: true,
    canVoidTransactions: false,
    canViewReports: true,
    canEditSettings: false,
    canApproveOverrides: true,
    canExportData: true,
  },
  [UserRole.ACCOUNTANT]: {
    canCreateCustomers: false,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canCreateSales: false,
    canCreatePayments: true,
    canCreateReturns: false,
    canCreateBuybacks: false,
    canVoidTransactions: false,
    canViewReports: true,
    canEditSettings: false,
    canApproveOverrides: true,
    canExportData: true,
  },
  [UserRole.SALES]: {
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,
    canCreateSales: true,
    canCreatePayments: false,
    canCreateReturns: true,
    canCreateBuybacks: true,
    canVoidTransactions: false,
    canViewReports: false,
    canEditSettings: false,
    canApproveOverrides: false,
    canExportData: false,
  },
  [UserRole.VIEWER]: {
    canCreateCustomers: false,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canCreateSales: false,
    canCreatePayments: false,
    canCreateReturns: false,
    canCreateBuybacks: false,
    canVoidTransactions: false,
    canViewReports: true,
    canEditSettings: false,
    canApproveOverrides: false,
    canExportData: false,
  },
};

export function getUserPermissions(role: string): Permission {
  return rolePermissions[role as UserRole] || rolePermissions[UserRole.VIEWER];
}

export function hasPermission(role: string, permission: keyof Permission): boolean {
  const permissions = getUserPermissions(role);
  return permissions[permission];
}

export function requirePermission(role: string, permission: keyof Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Insufficient permissions. Required: ${permission}, Role: ${role}`);
  }
}
