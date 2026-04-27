import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  metadata?: Record<string, any>;
  createdAt: string;
  userId?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
}

export function useRealTimeNotifications() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, urgent: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationId = useRef<string | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/simple-notifications?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      const newNotifications = data.notifications || [];

      // Check for new notifications
      if (newNotifications.length > 0 && lastNotificationId.current) {
        const newItems = newNotifications.filter(
          (n: Notification) => n.id !== lastNotificationId.current
        );
        
        if (newItems.length > 0) {
          // Show toast for new notifications
          newItems.forEach((notification: Notification) => {
            showNotificationToast(notification);
          });
        }
      }

      // Update last notification ID
      if (newNotifications.length > 0) {
        lastNotificationId.current = newNotifications[0].id;
      }

      setNotifications(newNotifications);
      setStats({
        total: data.pagination?.total || 0,
        unread: newNotifications.filter((n: Notification) => !n.isRead).length,
        urgent: newNotifications.filter((n: Notification) => n.priority === 'URGENT' && !n.isRead).length
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  // Fetch notification statistics
  const fetchStats = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/simple-notifications/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching notification stats:', err);
    }
  }, [session?.user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/simple-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        
        // Update stats
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/simple-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true }))
        );
        
        setStats(prev => ({
          ...prev,
          unread: 0
        }));
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Create immediate notification (for CRUD operations)
  const createImmediateNotification = useCallback(async (
    type: string,
    title: string,
    message: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM',
    metadata?: Record<string, any>
  ) => {
    try {
      // For now, create a simple notification object
      const newNotification = {
        id: `temp_${Date.now()}`,
        type,
        title,
        message,
        isRead: false,
        priority,
        metadata,
        createdAt: new Date().toISOString(),
        userId: undefined
      };
      
      // Add to local state immediately
      setNotifications(prev => [newNotification, ...prev]);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        unread: prev.unread + 1,
        urgent: priority === 'URGENT' ? prev.urgent + 1 : prev.urgent
      }));

      // Show toast notification
      showNotificationToast(newNotification);
      
      return newNotification;
    } catch (err) {
      console.error('Error creating immediate notification:', err);
    }
  }, []);

  // Show notification toast
  const showNotificationToast = useCallback((notification: Notification) => {
    // Build the toast purely with DOM APIs and `textContent` to ensure
    // user-controlled `notification.title` and `notification.message` are
    // never interpreted as HTML. Previously we used `innerHTML` here, which
    // turned every notification field into a stored-XSS sink (an attacker
    // who could plant `<img onerror=...>` into a customer name, vendor name,
    // expense description, etc. would execute script in every admin's
    // browser when the toast fired).
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full ${
      notification.priority === 'URGENT' ? 'bg-red-500 text-white' :
      notification.priority === 'HIGH' ? 'bg-orange-500 text-white' :
      notification.priority === 'MEDIUM' ? 'bg-blue-500 text-white' :
      'bg-gray-500 text-white'
    }`;

    const row = document.createElement('div');
    row.className = 'flex items-start space-x-3';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'flex-shrink-0';
    const icon = document.createElement('div');
    icon.className = `w-5 h-5 rounded-full ${
      notification.priority === 'URGENT' ? 'bg-red-300' :
      notification.priority === 'HIGH' ? 'bg-orange-300' :
      notification.priority === 'MEDIUM' ? 'bg-blue-300' :
      'bg-gray-300'
    }`;
    iconWrap.appendChild(icon);

    const body = document.createElement('div');
    body.className = 'flex-1';
    const title = document.createElement('h4');
    title.className = 'font-semibold text-sm';
    title.textContent = notification.title || '';
    const message = document.createElement('p');
    message.className = 'text-sm opacity-90';
    message.textContent = notification.message || '';
    body.appendChild(title);
    body.appendChild(message);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'text-white opacity-70 hover:opacity-100';
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => toast.remove());

    row.appendChild(iconWrap);
    row.appendChild(body);
    row.appendChild(closeBtn);
    toast.appendChild(row);

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 100);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }, []);

  // Start real-time monitoring
  useEffect(() => {
    if (session?.user) {
      // Initial fetch
      fetchNotifications();
      fetchStats();

      // Set up polling every 3 seconds
      intervalRef.current = setInterval(() => {
        fetchNotifications();
        fetchStats();
      }, 3000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [session?.user, fetchNotifications, fetchStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    notifications,
    stats,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    createImmediateNotification,
    refetch: fetchNotifications
  };
} 