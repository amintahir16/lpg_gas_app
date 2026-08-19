'use client';

import React from 'react';
import { NotificationProvider as ContextProvider } from '@/contexts/NotificationContext';
import { ToastContainer, useToast } from '@/components/ui/notification-toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { isQuietHoursActive } from '@/lib/notificationPreferences';

function NotificationToastManager() {
  const { filteredNotifications, preferences } = useNotifications();
  const { addToast, removeToast, toasts } = useToast();

  // Track which notification IDs have already been toasted in this session.
  const toastedIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    // If Push Notifications channel is toggled off, suppress browser toasts
    if (!preferences.push) return;

    const quiet = isQuietHoursActive(preferences.quietHours);
    const cutoff = Date.now() - 10000; // Last 10 seconds.
    const seen = toastedIdsRef.current;

    const newUrgentNotifications = filteredNotifications.filter((notification) => {
      if (quiet) return false; // Muted during quiet hours
      if (notification.priority !== 'URGENT') return false;
      if (notification.isRead) return false;
      if (seen.has(notification.id)) return false;
      const createdAt = new Date(notification.createdAt).getTime();
      if (Number.isNaN(createdAt)) return false;
      return createdAt > cutoff;
    });

    if (newUrgentNotifications.length === 0) return;

    newUrgentNotifications.forEach((notification) => {
      seen.add(notification.id);
      addToast({
        type: 'warning',
        title: notification.title,
        message: notification.message,
        duration: 8000,
        action: {
          label: 'View',
          onClick: () => {
            // Could navigate to notification center or mark as read.
          },
        },
      });
    });
  }, [filteredNotifications, preferences, addToast]);

  return (
    <ToastContainer
      notifications={toasts}
      onDismiss={removeToast}
      position="top-right"
      maxToasts={5}
    />
  );
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  return (
    <ContextProvider>
      {children}
      <NotificationToastManager />
    </ContextProvider>
  );
} 