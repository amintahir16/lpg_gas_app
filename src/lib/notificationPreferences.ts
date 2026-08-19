export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  lowPriority: boolean;
  mediumPriority: boolean;
  highPriority: boolean;
  urgentPriority: boolean;
  businessHours: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  types: {
    customer: boolean;
    vendor: boolean;
    cylinder: boolean;
    rental: boolean;
    payment: boolean;
    expense: boolean;
    inventory: boolean;
    maintenance: boolean;
    system: boolean;
  };
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  sms: false,
  lowPriority: true,
  mediumPriority: true,
  highPriority: true,
  urgentPriority: true,
  businessHours: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  types: {
    customer: true,
    vendor: true,
    cylinder: true,
    rental: true,
    payment: true,
    expense: true,
    inventory: true,
    maintenance: true,
    system: true,
  },
};

export const NOTIFICATION_PREFERENCES_STORAGE_KEY = 'notificationPreferences';
export const NOTIFICATION_PREFERENCES_CHANGED_EVENT = 'notificationPreferencesChanged';

export function getStoredNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...parsed,
      quietHours: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours,
        ...(parsed.quietHours || {}),
      },
      types: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.types,
        ...(parsed.types || {}),
      },
    };
  } catch (err) {
    console.error('Failed to load notification preferences from localStorage:', err);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function setStoredNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATION_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(NOTIFICATION_PREFERENCES_CHANGED_EVENT, { detail: prefs }));
  } catch (err) {
    console.error('Failed to save notification preferences to localStorage:', err);
  }
}

export function isQuietHoursActive(quietHours: NotificationPreferences['quietHours']): boolean {
  if (!quietHours?.enabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = (quietHours.start || '22:00').split(':').map((v) => parseInt(v, 10) || 0);
  const [endH, endM] = (quietHours.end || '08:00').split(':').map((v) => parseInt(v, 10) || 0);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight window (e.g. 22:00 to 08:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

export function matchesNotificationPreferences(
  notification: { type?: string | null; priority?: string | null },
  prefs: NotificationPreferences
): boolean {
  // Check Priority
  const priority = (notification.priority || 'MEDIUM').toUpperCase();
  if (priority === 'URGENT' && !prefs.urgentPriority) return false;
  if (priority === 'HIGH' && !prefs.highPriority) return false;
  if (priority === 'MEDIUM' && !prefs.mediumPriority) return false;
  if (priority === 'LOW' && !prefs.lowPriority) return false;

  // Check Type
  const type = (notification.type || '').toUpperCase();
  if (type.startsWith('CUSTOMER_') && !prefs.types.customer) return false;
  if (type.startsWith('VENDOR_') && !prefs.types.vendor) return false;
  if (type.startsWith('CYLINDER_') && !prefs.types.cylinder) return false;
  if (type.startsWith('RENTAL_') && !prefs.types.rental) return false;
  if (type.startsWith('PAYMENT_') && !prefs.types.payment) return false;
  if (type.startsWith('EXPENSE_') && !prefs.types.expense) return false;
  if ((type.startsWith('INVENTORY_') || type === 'LOW_INVENTORY') && !prefs.types.inventory) return false;
  if (type.startsWith('MAINTENANCE_') && !prefs.types.maintenance) return false;
  if ((type.startsWith('SYSTEM_') || type.startsWith('USER_')) && !prefs.types.system) return false;

  return true;
}
