"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeftIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface InventoryReport {
  id: string;
  title: string;
  description: string;
  type: 'summary' | 'detailed' | 'analytics';
  category: string;
  lastGenerated: string;
  data?: any;
}

export default function InventoryReportsPage() {
  const [reports, setReports] = useState<InventoryReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableReports();
  }, []);

  const fetchAvailableReports = async () => {
    // Mock reports data
    const mockReports: InventoryReport[] = [
      {
        id: 'cylinder-summary',
        title: 'Cylinder Inventory Summary',
        description: 'Overview of all cylinders by type and status',
        type: 'summary',
        category: 'Cylinders',
        lastGenerated: new Date().toISOString()
      },
      {
        id: 'cylinder-detailed',
        title: 'Detailed Cylinder Report',
        description: 'Complete cylinder inventory with locations and history',
        type: 'detailed',
        category: 'Cylinders',
        lastGenerated: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'customer-cylinders',
        title: 'Customer Cylinder Report',
        description: 'Cylinders currently with customers and rental details',
        type: 'detailed',
        category: 'Customers',
        lastGenerated: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: 'store-vehicle-inventory',
        title: 'Store & Vehicle Distribution',
        description: 'Inventory distribution across stores and vehicles',
        type: 'summary',
        category: 'Distribution',
        lastGenerated: new Date(Date.now() - 259200000).toISOString()
      },
      {
        id: 'accessories-inventory',
        title: 'Accessories & Equipment Report',
        description: 'Complete accessories inventory with costs and quantities',
        type: 'detailed',
        category: 'Accessories',
        lastGenerated: new Date(Date.now() - 345600000).toISOString()
      },
      {
        id: 'inventory-analytics',
        title: 'Inventory Analytics',
        description: 'Trends, usage patterns, and inventory optimization insights',
        type: 'analytics',
        category: 'Analytics',
        lastGenerated: new Date(Date.now() - 432000000).toISOString()
      }
    ];
    
    setReports(mockReports);
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) return;
    
    setLoading(true);
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update last generated date
      setReports(prev => prev.map(report => 
        report.id === selectedReport 
          ? { ...report, lastGenerated: new Date().toISOString() }
          : report
      ));
      
      alert('Report generated successfully!');
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = (reportId: string) => {
    // Mock download functionality
    alert(`Downloading ${reports.find(r => r.id === reportId)?.title}...`);
  };

  const handlePrintReport = (reportId: string) => {
    // Mock print functionality
    alert(`Printing ${reports.find(r => r.id === reportId)?.title}...`);
  };

  const handleViewReport = (reportId: string) => {
    // Mock view functionality
    alert(`Opening ${reports.find(r => r.id === reportId)?.title} for viewing...`);
  };

  const getReportIcon = (type: string) => {
    switch (type) {
      case 'summary':
        return '📊';
      case 'detailed':
        return '📋';
      case 'analytics':
        return '📈';
      default:
        return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'summary':
        return 'bg-blue-100 text-blue-800';
      case 'detailed':
        return 'bg-green-100 text-green-800';
      case 'analytics':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/inventory'}
            className="flex items-center space-x-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Reports</h1>
            <p className="mt-2 text-gray-600 font-medium">
              Generate and view comprehensive inventory reports
            </p>
          </div>
        </div>
      </div>

      {/* Report Generation Controls */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Generate New Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Report Type</label>
              <Select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)}>
                <option value="">Select a report...</option>
                {reports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date Range</label>
              <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
                <option value="all">All time</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleGenerateReport}
                disabled={!selectedReport || loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id} className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getReportIcon(report.type)}</span>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {report.title}
                    </CardTitle>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </div>
                </div>
                <Badge className={getTypeColor(report.type)}>
                  {report.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{report.category}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Generated:</span>
                  <span className="font-medium">
                    {new Date(report.lastGenerated).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex space-x-2 pt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewReport(report.id)}
                    className="flex-1"
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadReport(report.id)}
                    className="flex-1"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePrintReport(report.id)}
                    className="flex-1"
                  >
                    <PrinterIcon className="w-4 h-4 mr-1" />
                    Print
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Report Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{reports.length}</div>
              <div className="text-sm text-gray-600">Available Reports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reports.filter(r => new Date(r.lastGenerated) > new Date(Date.now() - 86400000)).length}
              </div>
              <div className="text-sm text-gray-600">Generated Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {reports.filter(r => r.type === 'analytics').length}
              </div>
              <div className="text-sm text-gray-600">Analytics Reports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {reports.filter(r => r.type === 'detailed').length}
              </div>
              <div className="text-sm text-gray-600">Detailed Reports</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
