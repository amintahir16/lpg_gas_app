'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface ToastProps {
  notification: ToastNotification;
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function Toast({ notification, onDismiss, position = 'top-right' }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { id, type, title, message, duration = 5000, action, dismissible = true } = notification;

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-dismiss
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    }

    return () => {
      clearTimeout(showTimer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration, id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(id);
    }, 300);
  };

  const handleAction = () => {
    if (action?.onClick) {
      action.onClick();
      handleDismiss();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getToastClasses = () => {
    const baseClasses = 'flex items-start space-x-3 p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-out max-w-sm';
    
    const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    };

    const typeClasses = {
      success: 'bg-green-50 border-green-500 text-green-900',
      error: 'bg-red-50 border-red-500 text-red-900',
      warning: 'bg-yellow-50 border-yellow-500 text-yellow-900',
      info: 'bg-blue-50 border-blue-500 text-blue-900',
    };

    const visibilityClasses = isVisible && !isExiting 
      ? 'translate-x-0 opacity-100 scale-100' 
      : 'translate-x-full opacity-0 scale-95';

    return cn(
      baseClasses,
      positionClasses[position],
      typeClasses[type],
      visibilityClasses
    );
  };

  const getActionButtonClasses = () => {
    const baseClasses = 'px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200';
    
    const typeClasses = {
      success: 'bg-green-100 text-green-800 hover:bg-green-200',
      error: 'bg-red-100 text-red-800 hover:bg-red-200',
      warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      info: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    };

    return cn(baseClasses, typeClasses[type]);
  };

  return (
    <div className={getToastClasses()}>
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold">{title}</h4>
        {message && (
          <p className="text-sm mt-1 opacity-90">{message}</p>
        )}
        
        {/* Action Button */}
        {action && (
          <button
            onClick={handleAction}
            className={getActionButtonClasses()}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Dismiss Button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface ToastContainerProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export function ToastContainer({ 
  notifications, 
  onDismiss, 
  position = 'top-right',
  maxToasts = 5 
}: ToastContainerProps) {
  const visibleNotifications = notifications.slice(0, maxToasts);

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed z-50 space-y-2 pointer-events-none">
      {visibleNotifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          position={position}
        />
      ))}
    </div>
  );
}

// Toast manager hook
export function useToast() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (notification: Omit<ToastNotification, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastNotification = { ...notification, id };
    
    setToasts(prev => [newToast, ...prev]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (title: string, message?: string, options?: Partial<ToastNotification>) => {
    return addToast({ type: 'success', title, message, ...options });
  };

  const error = (title: string, message?: string, options?: Partial<ToastNotification>) => {
    return addToast({ type: 'error', title, message, ...options });
  };

  const warning = (title: string, message?: string, options?: Partial<ToastNotification>) => {
    return addToast({ type: 'warning', title, message, ...options });
  };

  const info = (title: string, message?: string, options?: Partial<ToastNotification>) => {
    return addToast({ type: 'info', title, message, ...options });
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  };
} 