'use client';

import React from 'react';
import { NotificationProvider as ContextProvider } from '@/contexts/NotificationContext';
import { ToastContainer, useToast } from '@/components/ui/notification-toast';
import { useNotifications } from '@/contexts/NotificationContext';

function NotificationToastManager() {
  const { state } = useNotifications();
  const { addToast, removeToast, toasts } = useToast();

  // Show toast for new urgent notifications
  React.useEffect(() => {
    const newUrgentNotifications = state.notifications.filter(
      notification => 
        notification.priority === 'URGENT' && 
        !notification.isRead &&
        new Date(notification.createdAt) > new Date(Date.now() - 10000) // Last 10 seconds
    );

    newUrgentNotifications.forEach(notification => {
      addToast({
        type: 'warning',
        title: notification.title,
        message: notification.message,
        duration: 8000,
        action: {
          label: 'View',
          onClick: () => {
            // Could navigate to notification center or mark as read
            console.log('View notification:', notification.id);
          }
        }
      });
    });
  }, [state.notifications, addToast]);

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