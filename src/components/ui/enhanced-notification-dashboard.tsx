'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BellIcon, 
  XMarkIcon, 
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  FunnelIcon,
  TrashIcon,
  RefreshIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

interface EnhancedNotificationDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'unread' | 'urgent' | 'high' | 'medium' | 'low';
type SortType = 'newest' | 'oldest' | 'priority' | 'type';

export function EnhancedNotificationDashboard({ isOpen, onClose }: EnhancedNotificationDashboardProps) {
  const { state, markAsRead, markAllAsRead, removeNotification, refresh } = useNotifications();
  const { notifications, stats, isLoading, error, lastUpdate } = state;
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort notifications
  const filteredAndSortedNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.isRead);
        break;
      case 'urgent':
        filtered = filtered.filter(n => n.priority === 'URGENT');
        break;
      case 'high':
        filtered = filtered.filter(n => n.priority === 'HIGH');
        break;
      case 'medium':
        filtered = filtered.filter(n => n.priority === 'MEDIUM');
        break;
      case 'low':
        filtered = filtered.filter(n => n.priority === 'LOW');
        break;
      default:
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered = [...filtered].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'oldest':
        filtered = [...filtered].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case 'priority':
        const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        filtered = [...filtered].sort((a, b) => 
          priorityOrder[b.priority] - priorityOrder[a.priority]
        );
        break;
      case 'type':
        filtered = [...filtered].sort((a, b) => a.type.localeCompare(b.type));
        break;
    }

    return filtered;
  }, [notifications, filter, sortBy, searchQuery]);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'border-l-red-500 bg-red-50';
      case 'HIGH':
        return 'border-l-orange-500 bg-orange-50';
      case 'MEDIUM':
        return 'border-l-blue-500 bg-blue-50';
      case 'LOW':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
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

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleRemoveNotification = async (id: string) => {
    await removeNotification(id);
  };

  const handleRefresh = async () => {
    await refresh();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <BellIcon className="w-6 h-6 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {stats.unread > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.unread}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700"
              title="Refresh"
            >
              <RefreshIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex space-x-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Total</div>
              <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Unread</div>
              <div className="text-lg font-semibold text-blue-600">{stats.unread}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Urgent</div>
              <div className="text-lg font-semibold text-red-600">{stats.urgent}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={stats.unread === 0}
            className="text-sm"
          >
            Mark all read
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          {/* Search */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All', count: stats.total },
              { key: 'unread', label: 'Unread', count: stats.unread },
              { key: 'urgent', label: 'Urgent', count: stats.urgent },
              { key: 'high', label: 'High', count: notifications.filter(n => n.priority === 'HIGH').length },
              { key: 'medium', label: 'Medium', count: notifications.filter(n => n.priority === 'MEDIUM').length },
              { key: 'low', label: 'Low', count: notifications.filter(n => n.priority === 'LOW').length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as FilterType)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md border transition-colors",
                  filter === tab.key
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                )}
              >
                {tab.label}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {tab.count}
                </Badge>
              </button>
            ))}
          </div>

          {/* Sort Options */}
          <div className="mt-3 flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Priority</option>
              <option value="type">Type</option>
            </select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-300 mb-4" />
              <p className="text-red-500 font-medium">Error loading notifications</p>
              <p className="text-sm text-red-400 mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-3"
              >
                Retry
              </Button>
            </div>
          ) : filteredAndSortedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <BellIcon className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No notifications</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery 
                  ? 'No notifications match your search'
                  : filter === 'all' 
                    ? 'You\'re all caught up!' 
                    : `No ${filter} notifications`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAndSortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-gray-50 transition-colors border-l-4",
                    getPriorityColor(notification.priority),
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
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={notification.priority === 'URGENT' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {notification.priority}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p className={cn(
                        "text-sm mt-1",
                        !notification.isRead ? 'text-gray-800' : 'text-gray-600'
                      )}>
                        {notification.message}
                      </p>
                      
                      {/* Type Badge */}
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {notification.type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      
                      {/* Metadata */}
                      {notification.metadata && (
                        <div className="mt-2 text-xs text-gray-500">
                          {Object.entries(notification.metadata).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Mark as read"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveNotification(notification.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete notification"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              {lastUpdate 
                ? `Last updated: ${lastUpdate.toLocaleTimeString()}`
                : 'Notifications update every 10 seconds'
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Showing {filteredAndSortedNotifications.length} of {notifications.length} notifications
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 