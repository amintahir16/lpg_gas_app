"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: string;
}

export default function MyPaymentsPage() {
  const [payments] = useState<Payment[]>([
    { id: "1", date: "2024-08-01", amount: 150, method: "Credit Card", status: "Completed" },
    { id: "2", date: "2024-07-15", amount: 300, method: "Bank Transfer", status: "Completed" },
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">My Payments</h1>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-end mb-4">
            <Button>Make Payment</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${payment.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}