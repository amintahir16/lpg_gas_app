'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { BellIcon, CogIcon, TrashIcon, ArrowPathIcon, ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  getStoredNotificationPreferences,
  setStoredNotificationPreferences,
} from '@/lib/notificationPreferences';

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { state, markAsRead, markAllAsRead, removeNotification, fetchNotifications, fetchStats, preferences: contextPrefs, updatePreferences } = useNotifications();
  const { notifications, stats, isLoading } = state;

  const [preferences, setPreferences] = useState<NotificationPreferences>(contextPrefs || DEFAULT_NOTIFICATION_PREFERENCES);
  const [activeTab, setActiveTab] = useState<'preferences' | 'history' | 'stats'>('preferences');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setPreferences(getStoredNotificationPreferences());
  }, []);

  // Settings page needs the list — load once on mount (not on every tab focus).
  useEffect(() => {
    void Promise.all([fetchNotifications(), fetchStats()]);
  }, [fetchNotifications, fetchStats]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
  };

  const savePreferences = () => {
    try {
      setSavingPrefs(true);
      updatePreferences(preferences);
      setJustSaved(true);
      toast.success('Notification preferences saved successfully!', {
        id: 'pref-save-toast',
        duration: 3500,
      });
      showStatus('success', 'Notification preferences saved successfully');
      setTimeout(() => setJustSaved(false), 3000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save preferences');
      showStatus(
        'error',
        error instanceof Error ? error.message : 'Failed to save preferences'
      );
    } finally {
      setSavingPrefs(false);
    }
  };

  const handlePreferenceChange = (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (
    type: keyof NotificationPreferences['types'],
    value: boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      types: { ...prev.types, [type]: value },
    }));
  };

  const handleQuietHoursChange = (
    key: keyof NotificationPreferences['quietHours'],
    value: string | boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, [key]: value },
    }));
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchNotifications(), fetchStats()]);
      showStatus('success', 'Notifications refreshed');
    } catch (error) {
      showStatus(
        'error',
        error instanceof Error ? error.message : 'Failed to refresh notifications'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (stats.unread === 0) {
      showStatus('success', 'All notifications are already read');
      return;
    }
    try {
      setMarkingAll(true);
      await markAllAsRead();
      showStatus('success', 'All notifications marked as read');
    } catch (error) {
      showStatus(
        'error',
        error instanceof Error ? error.message : 'Failed to mark all as read'
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      setBusyId(id);
      await markAsRead(id);
    } catch (error) {
      showStatus(
        'error',
        error instanceof Error ? error.message : 'Failed to mark as read'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusyId(id);
      await removeNotification(id);
      showStatus('success', 'Notification deleted');
    } catch (error) {
      showStatus(
        'error',
        error instanceof Error ? error.message : 'Failed to delete notification'
      );
    } finally {
      setBusyId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const normalizeNotificationLink = (link: string): string => {
    if (link.startsWith('/inventory/custom-items')) {
      return link.replace('/inventory/custom-items', '/inventory/accessories');
    }
    return link;
  };

  const openNotification = async (notification: {
    id: string;
    isRead: boolean;
    link?: string | null;
  }) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
      if (notification.link) {
        router.push(normalizeNotificationLink(notification.link));
      }
    } catch (error) {
      showStatus(
        'error',
        error instanceof Error ? error.message : 'Failed to open notification'
      );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/dashboard');
              }
            }}
            className="flex items-center justify-center h-9 w-9 p-0 shrink-0"
            aria-label="Back"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
            <p className="text-gray-600">Configure how and when you receive notifications</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{stats.unread} unread</Badge>
          <Button
            type="button"
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing || isLoading}
          >
            <ArrowPathIcon
              className={`w-4 h-4 mr-2 ${refreshing || isLoading ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          type="button"
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
          type="button"
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
          type="button"
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

      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
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

              <div className="flex items-center justify-between gap-4">
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

              <div className="flex items-center justify-between gap-4">
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

          <Card>
            <CardHeader>
              <CardTitle>Priority Levels</CardTitle>
              <CardDescription>
                Choose which priority levels to receive notifications for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  {
                    key: 'urgentPriority' as const,
                    label: 'Urgent',
                    description: 'Critical system alerts and immediate action required',
                  },
                  {
                    key: 'highPriority' as const,
                    label: 'High',
                    description: 'Important business operations and status changes',
                  },
                  {
                    key: 'mediumPriority' as const,
                    label: 'Medium',
                    description: 'Regular business activities and updates',
                  },
                  {
                    key: 'lowPriority' as const,
                    label: 'Low',
                    description: 'Informational updates and user activities',
                  },
                ] as const
              ).map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor={key}>{label} Priority</Label>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                  <Switch
                    id={key}
                    checked={preferences[key]}
                    onCheckedChange={(checked) => handlePreferenceChange(key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>Choose which types of notifications to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                Object.entries(preferences.types) as Array<
                  [keyof NotificationPreferences['types'], boolean]
                >
              ).map(([type, enabled]) => (
                <div key={type} className="flex items-center justify-between gap-4">
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
                    onCheckedChange={(checked) => handleTypeChange(type, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Set times when you don&apos;t want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="quietHours">Enable Quiet Hours</Label>
                  <p className="text-sm text-gray-500">
                    Mute non-urgent notifications during specified hours
                  </p>
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

          <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 p-4 rounded-xl bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-lg transition-all duration-200">
            <div className="flex items-center gap-2 text-sm">
              {justSaved ? (
                <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                  <CheckIcon className="w-4 h-4 text-emerald-600 stroke-2" />
                  Preferences saved successfully!
                </span>
              ) : (
                <span className="text-gray-500 text-xs sm:text-sm">
                  Changes apply immediately to your notification bell and popups.
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={savePreferences}
                disabled={savingPrefs}
                className={cn(
                  "px-6 h-10 font-medium transition-all duration-200 shadow-sm",
                  justSaved
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                {savingPrefs ? (
                  <span className="flex items-center gap-2">
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Saving…
                  </span>
                ) : justSaved ? (
                  <span className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 stroke-2" />
                    Saved
                  </span>
                ) : (
                  'Save Preferences'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-medium">Notification History</h3>
            <Button
              type="button"
              onClick={handleMarkAllAsRead}
              variant="outline"
              size="sm"
              disabled={markingAll}
            >
              {markingAll ? 'Updating…' : 'Mark All as Read'}
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
                <Card
                  key={notification.id}
                  className={!notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          <Badge className={getPriorityColor(notification.priority)}>
                            {formatLabel(notification.priority)}
                          </Badge>
                          <Badge variant="outline">{formatLabel(notification.type)}</Badge>
                        </div>
                        <p className="mb-2 text-sm text-gray-600 break-words">
                          {notification.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span>{formatTimeAgo(notification.createdAt)}</span>
                          {notification.link && (
                            <button
                              type="button"
                              onClick={() => openNotification(notification)}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Open related page
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busyId === notification.id}
                            onClick={() => handleMarkRead(notification.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busyId === notification.id}
                          onClick={() => handleDelete(notification.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete notification"
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
