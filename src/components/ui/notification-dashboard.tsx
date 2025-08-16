import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BellIcon, 
  XMarkIcon, 
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';

interface NotificationDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDashboard({ isOpen, onClose }: NotificationDashboardProps) {
  const { 
    notifications, 
    stats, 
    markAsRead, 
    markAllAsRead, 
    isLoading 
  } = useRealTimeNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'urgent':
        return (notification.priority || 'MEDIUM') === 'URGENT';
      default:
        return true;
    }
  });

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
                {stats.unread || 0}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex space-x-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Total</div>
              <div className="text-lg font-semibold text-gray-900">{stats.total || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Unread</div>
              <div className="text-lg font-semibold text-blue-600">{stats.unread || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Urgent</div>
              <div className="text-lg font-semibold text-red-600">{stats.urgent || 0}</div>
            </div>
          </div>
                      <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={(stats.unread || 0) === 0}
              className="text-sm"
            >
              Mark all read
            </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'all', label: 'All', count: stats.total || 0 },
            { key: 'unread', label: 'Unread', count: stats.unread || 0 },
            { key: 'urgent', label: 'Urgent', count: stats.urgent || 0 }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                filter === tab.key
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-2 text-xs">
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <BellIcon className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No notifications</p>
              <p className="text-sm text-gray-400 mt-1">
                {filter === 'all' 
                  ? 'You\'re all caught up!' 
                  : filter === 'unread' 
                    ? 'No unread notifications'
                    : 'No urgent notifications'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                                     className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${getPriorityColor(notification.priority || 'MEDIUM')} ${
                     !notification.isRead ? 'bg-blue-50' : ''
                   }`}
                >
                  <div className="flex items-start space-x-3">
                                         <div className="flex-shrink-0 mt-1">
                       {getPriorityIcon(notification.priority || 'MEDIUM')}
                     </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${
                          !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                                                 <div className="flex items-center space-x-2">
                           <Badge 
                             variant={notification.priority === 'URGENT' ? 'destructive' : 'secondary'}
                             className="text-xs"
                           >
                             {notification.priority || 'MEDIUM'}
                           </Badge>
                           <span className="text-xs text-gray-400">
                             {formatTimeAgo(notification.createdAt)}
                           </span>
                         </div>
                      </div>
                      <p className={`text-sm mt-1 ${
                        !notification.isRead ? 'text-gray-800' : 'text-gray-600'
                      }`}>
                        {notification.message}
                      </p>
                      
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
                    
                    {/* Mark as read button */}
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(notification.id)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Mark as read"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </Button>
                    )}
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
              Notifications update every 3 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 