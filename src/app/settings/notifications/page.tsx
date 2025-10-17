'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { BellIcon, CogIcon, TrashIcon, RefreshIcon } from '@heroicons/react/24/outline';

interface NotificationPreferences {
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

export default function NotificationSettingsPage() {
  const { state, markAllAsRead, removeNotification, refresh } = useNotifications();
  const { notifications, stats } = state;
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
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
      end: '08:00'
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
      system: true
    }
  });

  const [activeTab, setActiveTab] = useState<'preferences' | 'history' | 'stats'>('preferences');

  useEffect(() => {
    // Load saved preferences from localStorage or API
    const savedPreferences = localStorage.getItem('notificationPreferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (e) {
        console.error('Failed to parse saved preferences:', e);
      }
    }
  }, []);

  const savePreferences = () => {
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
    // Here you would typically also save to the backend
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (type: keyof NotificationPreferences['types'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      types: { ...prev.types, [type]: value }
    }));
  };

  const handleQuietHoursChange = (key: keyof NotificationPreferences['quietHours'], value: any) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: { ...prev.quietHours, [key]: value }
    }));
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleRefresh = async () => {
    await refresh();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-gray-600">Configure how and when you receive notifications</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {stats.unread} unread
          </Badge>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'preferences'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CogIcon className="w-4 h-4 inline mr-2" />
          Preferences
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BellIcon className="w-4 h-4 inline mr-2" />
          History ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'stats'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Statistics
        </button>
      </div>

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {/* Notification Channels */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  id="email"
                  checked={preferences.email}
                  onCheckedChange={(checked) => handlePreferenceChange('email', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push">Push Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications in the browser</p>
                </div>
                <Switch
                  id="push"
                  checked={preferences.push}
                  onCheckedChange={(checked) => handlePreferenceChange('push', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms">SMS Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications via SMS (premium)</p>
                </div>
                <Switch
                  id="sms"
                  checked={preferences.sms}
                  onCheckedChange={(checked) => handlePreferenceChange('sms', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Priority Levels */}
          <Card>
            <CardHeader>
              <CardTitle>Priority Levels</CardTitle>
              <CardDescription>Choose which priority levels to receive notifications for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'urgentPriority', label: 'Urgent', description: 'Critical system alerts and immediate action required' },
                { key: 'highPriority', label: 'High', description: 'Important business operations and status changes' },
                { key: 'mediumPriority', label: 'Medium', description: 'Regular business activities and updates' },
                { key: 'lowPriority', label: 'Low', description: 'Informational updates and user activities' }
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key}>{label} Priority</Label>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                  <Switch
                    id={key}
                    checked={preferences[key as keyof NotificationPreferences] as boolean}
                    onCheckedChange={(checked) => handlePreferenceChange(key as keyof NotificationPreferences, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>Choose which types of notifications to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(preferences.types).map(([type, enabled]) => (
                <div key={type} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={`type-${type}`} className="capitalize">
                      {type} Notifications
                    </Label>
                    <p className="text-sm text-gray-500">
                      Receive notifications about {type} related activities
                    </p>
                  </div>
                  <Switch
                    id={`type-${type}`}
                    checked={enabled}
                    onCheckedChange={(checked) => handleTypeChange(type as keyof NotificationPreferences['types'], checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>Set times when you don't want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="quietHours">Enable Quiet Hours</Label>
                  <p className="text-sm text-gray-500">Mute non-urgent notifications during specified hours</p>
                </div>
                <Switch
                  id="quietHours"
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={(checked) => handleQuietHoursChange('enabled', checked)}
                />
              </div>

              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quietStart">Start Time</Label>
                    <input
                      type="time"
                      id="quietStart"
                      value={preferences.quietHours.start}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quietEnd">End Time</Label>
                    <input
                      type="time"
                      id="quietEnd"
                      value={preferences.quietHours.end}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={savePreferences} className="px-8">
              Save Preferences
            </Button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Notification History</h3>
            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
              Mark All as Read
            </Button>
          </div>

          {notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card key={notification.id} className={!notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{notification.title}</h4>
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <Badge variant="outline">
                            {notification.type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatTimeAgo(notification.createdAt)}</span>
                          {notification.metadata && (
                            <span>Metadata: {JSON.stringify(notification.metadata)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNotification(notification.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-sm text-gray-500">All time notifications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unread</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.unread}</div>
              <p className="text-sm text-gray-500">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Urgent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.urgent}</div>
              <p className="text-sm text-gray-500">Critical priority</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 