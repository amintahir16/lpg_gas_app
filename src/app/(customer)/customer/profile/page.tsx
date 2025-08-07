"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "123-456-7890",
    address: "123 Main St, City, Country",
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setProfile(form);
    setEditing(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile</h1>
      <div className="bg-white shadow rounded-lg p-6">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                className="w-full border rounded-md p-2 text-sm"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                className="w-full border rounded-md p-2 text-sm"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                className="w-full border rounded-md p-2 text-sm"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="w-full border rounded-md p-2 text-sm"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                className="w-full border rounded-md p-2 text-sm"
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">First Name</span>
              <span className="text-gray-900">{profile.firstName}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Last Name</span>
              <span className="text-gray-900">{profile.lastName}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Email</span>
              <span className="text-gray-900">{profile.email}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Phone</span>
              <span className="text-gray-900">{profile.phone}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Address</span>
              <span className="text-gray-900">{profile.address}</span>
            </div>
            <Button onClick={() => setEditing(true)}>Edit Profile</Button>
          </div>
        )}
      </div>
    </div>
  );
}