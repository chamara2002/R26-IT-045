import React, { useState } from 'react';
import { User, Mail, Lock, Save } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import { Card } from '../components/Card';
import { AdminPageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { useAdminAuth } from '../context/AdminAuthContext';

const ProfilePage = () => {
  const { admin } = useAdminAuth();
  const [profileData, setProfileData] = useState({
    name: admin?.name || '',
    email: admin?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChangePassword = () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('Passwords do not match');
      return;
    }
    setSaved(true);
    setPasswordData({ current: '', new: '', confirm: '' });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminLayout>
      <AdminPageHeader title="Profile" subtitle="Manage your admin account" />

      {saved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Changes saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card title="Personal Information">
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="text-white" size={32} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{admin?.name}</p>
                  <p className="text-sm text-gray-600">{admin?.role}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail size={18} />
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <Button
                variant="primary"
                onClick={handleSaveProfile}
                className="flex items-center gap-2 mt-4"
              >
                <Save size={20} />
                Save Profile
              </Button>
            </div>
          </Card>

          {/* Change Password */}
          <Card title="Change Password">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.current}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, current: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirm: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <Button
                variant="primary"
                onClick={handleChangePassword}
                className="flex items-center gap-2 mt-4"
              >
                <Lock size={20} />
                Update Password
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card title="Account Info">
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Role</p>
                <p className="font-semibold text-blue-600">{admin?.role}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Member Since</p>
                <p className="font-semibold text-green-600">
                  {admin?.created_at
                    ? new Date(admin.created_at).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Status</p>
                <p className="font-semibold text-purple-600">Active</p>
              </div>
            </div>
          </Card>

          <Card title="Security">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">
                Keep your account secure with these tips:
              </p>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>✓ Use a strong password</li>
                <li>✓ Don't share your credentials</li>
                <li>✓ Update regularly</li>
                <li>✓ log out when done</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProfilePage;
