'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, XMarkIcon, CheckIcon, ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  className?: string;
  showBadge?: boolean;
  variant?: 'default' | 'minimal';
}

export function NotificationBell({ 
  className = '', 
  showBadge = true, 
  variant = 'default' 
}: NotificationBellProps) {
  const { state, markAsRead, removeNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, stats } = state;
  const unreadCount = stats.unread || 0;
  const urgentCount = stats.urgent || 0;

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        bellRef.current && 
        !bellRef.current.contains(event.target as Node) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key to close
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Animate bell when new urgent notifications arrive
  useEffect(() => {
    if (urgentCount > 0 && !isAnimating) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [urgentCount, isAnimating]);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const getBadgeVariant = () => {
    if (urgentCount > 0) return 'destructive';
    if (unreadCount > 0) return 'secondary';
    return 'secondary';
  };

  const getBadgeContent = () => {
    if (urgentCount > 0) return urgentCount > 99 ? '99+' : urgentCount;
    if (unreadCount > 0) return unreadCount > 99 ? '99+' : unreadCount;
    return '';
  };

  const getBellIconClass = () => {
    let baseClass = 'w-5 h-5 transition-all duration-200';
    
    if (isAnimating) {
      baseClass += ' animate-pulse text-red-500';
    } else if (urgentCount > 0) {
      baseClass += ' text-red-500';
    } else if (unreadCount > 0) {
      baseClass += ' text-orange-500';
    } else {
      baseClass += ' text-gray-500';
    }
    
    return baseClass;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      case 'HIGH':
        return <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />;
      case 'MEDIUM':
        return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
      case 'LOW':
        return <CheckCircleIcon className="w-4 h-4 text-gray-500" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleRemoveNotification = async (id: string) => {
    await removeNotification(id);
  };

  if (variant === 'minimal') {
    return (
      <div className="relative">
        <Button
          ref={bellRef}
          variant="ghost"
          size="icon"
          onClick={handleBellClick}
          className={`relative ${className}`}
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <BellIcon className={getBellIconClass()} />
          {showBadge && unreadCount > 0 && (
            <Badge 
              variant={getBadgeVariant()}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {getBadgeContent()}
            </Badge>
          )}
        </Button>
        
        {/* Simple Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              </div>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600 mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-gray-50 transition-colors",
                        !notification.isRead ? 'bg-blue-50' : ''
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getPriorityIcon(notification.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={cn(
                              "text-sm font-medium",
                              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                            )}>
                              {notification.title}
                            </h4>
                            <Badge 
                              variant={notification.priority === 'URGENT' ? 'destructive' : 'secondary'}
                              className="text-xs ml-2"
                            >
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className={cn(
                            "text-sm mt-1",
                            !notification.isRead ? 'text-gray-800' : 'text-gray-600'
                          )}>
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            <div className="flex items-center space-x-1">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Mark read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveNotification(notification.id)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 10 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="w-full"
                >
                  View All Notifications
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        ref={bellRef}
        variant="ghost"
        size="icon"
        onClick={handleBellClick}
        className={`relative group ${className}`}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <BellIcon className={getBellIconClass()} />
        
        {/* Hover effect */}
        <div className="absolute inset-0 rounded-lg bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        
        {/* Badge */}
        {showBadge && unreadCount > 0 && (
          <Badge 
            variant={getBadgeVariant()}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center animate-in slide-in-from-top-1 duration-200"
          >
            {getBadgeContent()}
          </Badge>
        )}
        
        {/* Pulse animation for urgent notifications */}
        {urgentCount > 0 && (
          <div className="absolute inset-0 rounded-lg bg-red-200 opacity-0 animate-ping" />
        )}
      </Button>
      
      {/* Notification count tooltip */}
      {unreadCount > 0 && (
        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          {urgentCount > 0 && ` (${urgentCount} urgent)`}
        </div>
      )}
      
      {/* Simple Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </Button>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-gray-50 transition-colors",
                      !notification.isRead ? 'bg-blue-50' : ''
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getPriorityIcon(notification.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={cn(
                            "text-sm font-medium",
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          )}>
                            {notification.title}
                          </h4>
                          <Badge 
                            variant={notification.priority === 'URGENT' ? 'destructive' : 'secondary'}
                            className="text-xs ml-2"
                          >
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className={cn(
                          "text-sm mt-1",
                          !notification.isRead ? 'text-gray-800' : 'text-gray-600'
                        )}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          <div className="flex items-center space-x-1">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Mark read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveNotification(notification.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-full"
              >
                View All Notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 