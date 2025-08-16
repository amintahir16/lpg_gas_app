'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
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

interface NotificationState {
  notifications: Notification[];
  stats: NotificationStats;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'SET_STATS'; payload: NotificationStats }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATION'; payload: { id: string; updates: Partial<Notification> } }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'SET_LAST_UPDATE'; payload: Date };

const initialState: NotificationState = {
  notifications: [],
  stats: { total: 0, unread: 0, urgent: 0 },
  isLoading: false,
  error: null,
  lastUpdate: null,
};

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        stats: {
          ...state.stats,
          total: state.stats.total + 1,
          unread: state.stats.unread + 1,
          urgent: action.payload.priority === 'URGENT' ? state.stats.urgent + 1 : state.stats.urgent,
        },
      };
    
    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload.id ? { ...n, ...action.payload.updates } : n
        ),
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        stats: {
          ...state.stats,
          total: Math.max(0, state.stats.total - 1),
        },
      };
    
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, isRead: true } : n
        ),
        stats: {
          ...state.stats,
          unread: Math.max(0, state.stats.unread - 1),
        },
      };
    
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        stats: {
          ...state.stats,
          unread: 0,
        },
      };
    
    case 'SET_LAST_UPDATE':
      return { ...state, lastUpdate: action.payload };
    
    default:
      return state;
  }
}

interface NotificationContextType {
  state: NotificationState;
  fetchNotifications: () => Promise<void>;
  fetchStats: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<Notification>;
  removeNotification: (id: string) => Promise<void>;
  clearError: () => void;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { data: session } = useSession();
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await fetch('/api/notifications?limit=100');
      if (!response.ok) {
        console.log('Failed to fetch notifications');
        console.log(response);
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      dispatch({ type: 'SET_NOTIFICATIONS', payload: data.notifications || [] });
      dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error fetching notifications:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [session?.user]);

  // Fetch notification statistics
  const fetchStats = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/notifications/stats');
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_STATS', payload: data });
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  }, [session?.user]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] }),
      });

      if (response.ok) {
        dispatch({ type: 'MARK_AS_READ', payload: id });
        // Refresh stats after marking as read
        await fetchStats();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [fetchStats]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (response.ok) {
        dispatch({ type: 'MARK_ALL_AS_READ' });
        // Refresh stats after marking all as read
        await fetchStats();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [fetchStats]);

  // Create a new notification
  const createNotification = useCallback(async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });

      if (response.ok) {
        const createdNotification = await response.json();
        dispatch({ type: 'ADD_NOTIFICATION', payload: createdNotification });
        return createdNotification;
      } else {
        throw new Error('Failed to create notification');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }, []);

  // Remove a notification
  const removeNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
        // Refresh stats after removal
        await fetchStats();
      }
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  }, [fetchStats]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchStats()]);
  }, [fetchNotifications, fetchStats]);

  // Set up polling for real-time updates
  useEffect(() => {
    if (session?.user) {
      // Initial fetch
      fetchNotifications();
      fetchStats();

      // Set up polling every 10 seconds
      const interval = setInterval(() => {
        fetchNotifications();
        fetchStats();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [session?.user, fetchNotifications, fetchStats]);

  const contextValue: NotificationContextType = {
    state,
    fetchNotifications,
    fetchStats,
    markAsRead,
    markAllAsRead,
    createNotification,
    removeNotification,
    clearError,
    refresh,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
} 