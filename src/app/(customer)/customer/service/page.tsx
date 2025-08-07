"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Describe your issue or request</label>
              <textarea
                className="w-full border rounded-md p-2 text-sm"
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>
            <Button type="submit">Submit Request</Button>
          </form>
        )}
      </div>
    </div>
  );
}