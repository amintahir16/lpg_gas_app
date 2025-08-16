'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useNotifications } from '@/contexts/NotificationContext';
import { useToast } from '@/components/ui/notification-toast';
import { notificationIntegration } from '@/lib/notificationIntegration';

export default function TestNotificationsPage() {
  const { createNotification } = useNotifications();
  const { success, error, warning, info } = useToast();
  
  const [notificationData, setNotificationData] = useState({
    type: 'SYSTEM_ALERT',
    title: '',
    message: '',
    priority: 'MEDIUM' as const,
    userId: '',
    metadata: ''
  });

  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()}: ${result}`, ...prev.slice(0, 9)]);
  };

  const handleCreateNotification = async () => {
    try {
      let metadata = {};
      if (notificationData.metadata) {
        try {
          metadata = JSON.parse(notificationData.metadata);
        } catch (e) {
          metadata = { customData: notificationData.metadata };
        }
      }

      await createNotification({
        type: notificationData.type as any,
        title: notificationData.title,
        message: notificationData.message,
        userId: notificationData.userId || undefined,
        metadata,
        priority: notificationData.priority
      });

      addTestResult(`✅ Created notification: ${notificationData.title}`);
      success('Notification Created', 'The notification has been created successfully!');
    } catch (err) {
      addTestResult(`❌ Failed to create notification: ${err}`);
      error('Creation Failed', 'Failed to create the notification. Check console for details.');
    }
  };

  const testBusinessNotifications = async () => {
    try {
      // Test customer notification
      await notificationIntegration.notifyCustomerCreated(
        'John Doe',
        'CUST001',
        'admin@lpg-gas.com'
      );
      addTestResult('✅ Customer created notification sent');

      // Test vendor notification
      await notificationIntegration.notifyVendorCreated(
        'ABC Supplies',
        'VEND001',
        'admin@lpg-gas.com'
      );
      addTestResult('✅ Vendor created notification sent');

      // Test cylinder notification
      await notificationIntegration.notifyCylinderAdded(
        'CYL001',
        'LPG_20KG',
        'admin@lpg-gas.com'
      );
      addTestResult('✅ Cylinder added notification sent');

      // Test payment notification
      await notificationIntegration.notifyPaymentReceived(
        150.00,
        'John Doe',
        'Credit Card'
      );
      addTestResult('✅ Payment received notification sent');

      // Test low inventory alert
      await notificationIntegration.notifyLowInventory(
        'LPG_20KG',
        3,
        5
      );
      addTestResult('✅ Low inventory alert sent');

      success('Test Complete', 'All business notification tests completed successfully!');
    } catch (err) {
      addTestResult(`❌ Business notification test failed: ${err}`);
      error('Test Failed', 'Some business notification tests failed. Check console for details.');
    }
  };

  const testToastNotifications = () => {
    success('Success Toast', 'This is a success notification toast!');
    addTestResult('✅ Success toast shown');

    setTimeout(() => {
      info('Info Toast', 'This is an informational toast notification.');
      addTestResult('✅ Info toast shown');
    }, 500);

    setTimeout(() => {
      warning('Warning Toast', 'This is a warning toast notification.');
      addTestResult('✅ Warning toast shown');
    }, 1000);

    setTimeout(() => {
      error('Error Toast', 'This is an error toast notification.');
      addTestResult('✅ Error toast shown');
    }, 1500);
  };

  const testSystemAlerts = async () => {
    try {
      await notificationIntegration.notifySystemAlert(
        'System Maintenance',
        'Scheduled maintenance will begin in 30 minutes. Please save your work.',
        'HIGH'
      );
      addTestResult('✅ High priority system alert sent');

      await notificationIntegration.notifySystemAlert(
        'Database Backup',
        'Daily database backup completed successfully.',
        'LOW'
      );
      addTestResult('✅ Low priority system alert sent');

      success('System Alerts Sent', 'System alert notifications have been created!');
    } catch (err) {
      addTestResult(`❌ System alert test failed: ${err}`);
      error('Test Failed', 'Failed to create system alerts.');
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification System Test Page</h1>
        <p className="text-gray-600">Test and demonstrate all notification system features</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custom Notification Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Custom Notification</CardTitle>
            <CardDescription>Create a notification with custom parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="type">Notification Type</Label>
              <Select value={notificationData.type} onValueChange={(value) => setNotificationData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYSTEM_ALERT">System Alert</SelectItem>
                  <SelectItem value="USER_ACTIVITY">User Activity</SelectItem>
                  <SelectItem value="CUSTOMER_ADDED">Customer Added</SelectItem>
                  <SelectItem value="VENDOR_ADDED">Vendor Added</SelectItem>
                  <SelectItem value="CYLINDER_ADDED">Cylinder Added</SelectItem>
                  <SelectItem value="PAYMENT_RECEIVED">Payment Received</SelectItem>
                  <SelectItem value="LOW_INVENTORY">Low Inventory</SelectItem>
                  <SelectItem value="MAINTENANCE_DUE">Maintenance Due</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={notificationData.title}
                onChange={(e) => setNotificationData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Notification title"
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={notificationData.message}
                onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Notification message"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={notificationData.priority} onValueChange={(value: any) => setNotificationData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="userId">User ID (optional)</Label>
              <Input
                id="userId"
                value={notificationData.userId}
                onChange={(e) => setNotificationData(prev => ({ ...prev, userId: e.target.value }))}
                placeholder="Leave empty for global notification"
              />
            </div>

            <div>
              <Label htmlFor="metadata">Metadata (JSON, optional)</Label>
              <Input
                id="metadata"
                value={notificationData.metadata}
                onChange={(e) => setNotificationData(prev => ({ ...prev, metadata: e.target.value }))}
                placeholder='{"key": "value"}'
              />
            </div>

            <Button onClick={handleCreateNotification} className="w-full">
              Create Notification
            </Button>
          </CardContent>
        </Card>

        {/* Quick Test Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Tests</CardTitle>
            <CardDescription>Test different notification scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testBusinessNotifications} variant="outline" className="w-full">
              Test Business Notifications
            </Button>

            <Button onClick={testToastNotifications} variant="outline" className="w-full">
              Test Toast Notifications
            </Button>

            <Button onClick={testSystemAlerts} variant="outline" className="w-full">
              Test System Alerts
            </Button>

            <Button onClick={clearTestResults} variant="outline" className="w-full">
              Clear Test Results
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>Results from notification tests</CardDescription>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No test results yet. Run some tests to see results here.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                  {result}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
          <CardDescription>Instructions for testing the notification system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>1. Custom Notifications:</strong> Fill out the form above to create custom notifications with specific parameters.</p>
            <p><strong>2. Business Notifications:</strong> Click "Test Business Notifications" to test all business operation notifications.</p>
            <p><strong>3. Toast Notifications:</strong> Click "Test Toast Notifications" to see immediate toast feedback.</p>
            <p><strong>4. System Alerts:</strong> Click "Test System Alerts" to test system-level notifications.</p>
            <p><strong>5. View Results:</strong> Check the test results section to see the status of each test.</p>
            <p><strong>6. Check Bell:</strong> Look at the notification bell in the header to see created notifications.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 