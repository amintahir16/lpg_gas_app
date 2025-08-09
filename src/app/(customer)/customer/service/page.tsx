"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function RequestServicePage() {
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setDescription("");
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Request Service</h1>
      <div className="bg-white shadow rounded-lg p-6">
        {submitted ? (
          <div className="text-green-600 font-medium">Your request has been submitted!</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Describe your issue or request</label>
              <Textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Please describe your issue or service request in detail..."
                required
              />
            </div>
            <Button type="submit" className="w-full">Submit Request</Button>
          </form>
        )}
      </div>
    </div>
  );
}