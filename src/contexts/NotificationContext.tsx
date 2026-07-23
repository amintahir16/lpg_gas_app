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
  link?: string | null;
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
    
    case 'REMOVE_NOTIFICATION': {
      const removed = state.notifications.find((n) => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
        stats: {
          ...state.stats,
          total: Math.max(0, state.stats.total - 1),
          unread:
            removed && !removed.isRead
              ? Math.max(0, state.stats.unread - 1)
              : state.stats.unread,
          urgent:
            removed && !removed.isRead && removed.priority === 'URGENT'
              ? Math.max(0, state.stats.urgent - 1)
              : state.stats.urgent,
        },
      };
    }
    
    case 'MARK_AS_READ': {
      const target = state.notifications.find((n) => n.id === action.payload);
      if (!target || target.isRead) return state;
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, isRead: true } : n
        ),
        stats: {
          ...state.stats,
          unread: Math.max(0, state.stats.unread - 1),
          urgent:
            target.priority === 'URGENT'
              ? Math.max(0, state.stats.urgent - 1)
              : state.stats.urgent,
        },
      };
    }
    
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
  fetchNotifications: () => Promise<boolean>;
  fetchStats: () => Promise<boolean>;
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

  // Fetch notifications from API. Returns false on failure so callers can decide
  // whether to retry — never used for background polling.
  const fetchNotifications = useCallback(async (): Promise<boolean> => {
    if (!session?.user) return true;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await fetch('/api/notifications?limit=100', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status !== 0) {
          console.log('Failed to fetch notifications:', response.status, response.statusText);
        }
        return false;
      }

      const data = await response.json();
      dispatch({ type: 'SET_NOTIFICATIONS', payload: data.notifications || [] });
      dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
      return true;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return false;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error fetching notifications:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [session?.user]);

  // Fetch notification statistics
  const fetchStats = useCallback(async (): Promise<boolean> => {
    if (!session?.user) return true;

    try {
      const response = await fetch('/api/notifications/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        dispatch({
          type: 'SET_STATS',
          payload: {
            total: data.total ?? 0,
            unread: data.unread ?? 0,
            urgent: data.urgent ?? 0,
          },
        });
        return true;
      }
      return false;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return false;
      }
      console.error('Error fetching notification stats:', error);
      return false;
    }
  }, [session?.user]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to mark notification as read');
      }

      dispatch({ type: 'MARK_AS_READ', payload: id });
      await fetchStats();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }, [fetchStats]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to mark all notifications as read');
      }

      dispatch({ type: 'MARK_ALL_AS_READ' });
      await fetchStats();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }, [fetchStats]);

  // Create a new notification
  const createNotification = useCallback(async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
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
      const response = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete notification');
      }

      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      await fetchStats();
    } catch (error) {
      console.error('Error removing notification:', error);
      throw error;
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

  // Action-driven only: load when the user signs in, and again when they
  // return to this tab. No background timer — notifications are created on
  // the server when sales / stock / CRUD actions run; the UI just reads them.
  useEffect(() => {
    if (!session?.user) {
      dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
      dispatch({ type: 'SET_STATS', payload: { total: 0, unread: 0, urgent: 0 } });
      return;
    }

    void refresh();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [session?.user, refresh]);

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