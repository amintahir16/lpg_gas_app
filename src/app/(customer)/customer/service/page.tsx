"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ServiceRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
}

export default function RequestServicePage() {
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    title: "",
    description: "",
    priority: "MEDIUM"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRequest: ServiceRequest = {
      id: `SR-${Date.now()}`,
      type: formData.type,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: "PENDING",
      createdAt: new Date().toISOString().split('T')[0]
    };

    setServiceRequests(prev => [newRequest, ...prev]);
    setFormData({
      type: "",
      title: "",
      description: "",
      priority: "MEDIUM"
    });
    setSubmitted(true);
    setShowForm(false);
    
    // Reset submitted state after 3 seconds
    setTimeout(() => setSubmitted(false), 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
        <Button onClick={() => setShowForm(true)}>New Service Request</Button>
      </div>

      {/* Success Message */}
      {submitted && (
        <Card className="border-0 shadow-sm bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">✓</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-green-800 font-medium">Service request submitted successfully!</p>
                <p className="text-green-700 text-sm">We'll get back to you within 24 hours.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Request Form */}
      {showForm && (
        <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">New Service Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  required
                >
                  <option value="">Select service type</option>
                  <option value="CYLINDER_DELIVERY">Cylinder Delivery</option>
                  <option value="CYLINDER_PICKUP">Cylinder Pickup</option>
                  <option value="MAINTENANCE">Maintenance Service</option>
                  <option value="SAFETY_INSPECTION">Safety Inspection</option>
                  <option value="EQUIPMENT_REPAIR">Equipment Repair</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief description of your service request"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  required
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Please provide detailed information about your service request..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Submit Request</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Service Request History */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Service Request History</CardTitle>
        </CardHeader>
        <CardContent>
          {serviceRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">📋</span>
              </div>
              <p className="text-gray-600">No service requests yet.</p>
              <p className="text-gray-500 text-sm">Create your first service request to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {serviceRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{request.title}</h3>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className={getStatusColor(request.status)}>
                        {request.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary" className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{request.description}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Type: {request.type.replace('_', ' ')}</span>
                    <span>Created: {request.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Service Options */}
      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Quick Service Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🚚</span>
                <h3 className="font-semibold text-gray-900">Express Delivery</h3>
              </div>
              <p className="text-sm text-gray-600">Same-day cylinder delivery for urgent needs</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🔧</span>
                <h3 className="font-semibold text-gray-900">Maintenance</h3>
              </div>
              <p className="text-sm text-gray-600">Regular cylinder maintenance and inspection</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">🛡️</span>
                <h3 className="font-semibold text-gray-900">Safety Check</h3>
              </div>
              <p className="text-sm text-gray-600">Professional safety inspection services</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}