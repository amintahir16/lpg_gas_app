"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function VendorDebugPage() {
  const { data: session, status } = useSession();
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testAPI = async () => {
    setError(null);
    setApiResponse(null);

    try {
      console.log('Testing API...');
      const response = await fetch('/api/vendor-categories');
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        setError(`API Error: ${response.status} - ${data.error || 'Unknown error'}`);
      } else {
        setApiResponse(data);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(`Fetch Error: ${err.message}`);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      testAPI();
    }
  }, [status]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Vendor System Debug Page</h1>

      <div className="space-y-6">
        {/* Session Info */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Status:</strong>{' '}
                <span className={
                  status === 'authenticated' ? 'text-green-600' :
                  status === 'loading' ? 'text-yellow-600' :
                  'text-red-600'
                }>
                  {status.toUpperCase()}
                </span>
              </div>
              {session?.user && (
                <>
                  <div><strong>User:</strong> {session.user.name}</div>
                  <div><strong>Email:</strong> {session.user.email}</div>
                  <div><strong>Role:</strong> {session.user.role}</div>
                  <div><strong>User ID:</strong> {session.user.id}</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* API Test */}
        <Card>
          <CardHeader>
            <CardTitle>API Test: /api/vendor-categories</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testAPI} className="mb-4">
              Test API
            </Button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                <h3 className="font-semibold text-red-900 mb-2">Error:</h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {apiResponse && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="font-semibold text-green-900 mb-2">Success!</h3>
                <p className="text-green-700 mb-2">
                  Found {apiResponse.categories?.length || 0} categories
                </p>
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium">
                    View Full Response
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto p-2 bg-white rounded border">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {!error && !apiResponse && status === 'authenticated' && (
              <p className="text-gray-500">Click "Test API" to check the connection</p>
            )}

            {status !== 'authenticated' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-yellow-800">
                  ⚠️ You must be logged in to test the API
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Check */}
        <Card>
          <CardHeader>
            <CardTitle>Expected Database Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Categories:</span>
                <strong>5 expected</strong>
              </div>
              <div className="flex justify-between">
                <span>Vendors:</span>
                <strong>12 expected</strong>
              </div>
              <div className="flex justify-between">
                <span>Items:</span>
                <strong>36 expected</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Make sure you are logged in (check Authentication Status above)</li>
              <li>Click "Test API" button to check if API is accessible</li>
              <li>Check browser console for any errors (Press F12)</li>
              <li>If you see "Unauthorized", log out and log back in</li>
              <li>If data is loading but not showing, clear browser cache</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

