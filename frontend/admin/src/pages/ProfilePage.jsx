import React, { useState } from 'react';
import { User, Mail, Lock, Save, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import PageWrapper, { PageHeader } from '../../../src/components/PageWrapper';
import { Card, Badge, Button } from '../../../src/components/ui/index.jsx';
import { useAdminAuth } from '../context/AdminAuthContext';
import { updateUser } from '../services/adminAPI';

export default function ProfilePage() {
  const { admin } = useAdminAuth();
  const [profileData, setProfileData] = useState({
    name: admin?.name || '',
    email: admin?.email || '',
    phone: admin?.phone || '',
  });
  const [passwordData, setPasswordData] = useState({
    new: '',
    confirm: '',
  });
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setStatusMsg({ type: '', text: '' });
    if (!admin?.id) return;
    setIsSaving(true);
    try {
      await updateUser(admin.id, {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
      });
      setStatusMsg({ type: 'success', text: 'Admin profile updated successfully!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || err.message || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setStatusMsg({ type: '', text: '' });
    if (!passwordData.new) {
      setStatusMsg({ type: 'error', text: 'Please enter a new password' });
      return;
    }
    if (passwordData.new.length < 8) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      setStatusMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsSaving(true);
    try {
      await updateUser(admin.id, {
        password: passwordData.new,
      });
      setPasswordData({ new: '', confirm: '' });
      setStatusMsg({ type: 'success', text: 'Admin password changed successfully!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.error || err.message || 'Failed to update password' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PageWrapper className="space-y-8">
        <PageHeader
          title="Admin Profile & Security"
          subtitle="Manage administrative credentials, contact details, and access password."
        />

        {statusMsg.text && (
          <div className={`p-3.5 rounded-xl border text-xs font-semibold ${
            statusMsg.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
          }`}>
            {statusMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Account Details */}
            <Card className="p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Account Details
              </h3>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                  {admin?.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{admin?.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="success">Platform Admin</Badge>
                    <span className="text-xs text-slate-400 font-mono">ID: #{admin?.id}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </Card>

            {/* Password Change */}
            <Card className="p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Change Admin Password
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min 8 characters"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-type new password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleChangePassword}
                disabled={isSaving}
              >
                <Lock className="h-4 w-4" />
                Update Password
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Security Recommendations
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={14} className="shrink-0" />
                  <span>Two-factor ready account</span>
                </li>
                <li>• Use at least 8 characters with numbers & symbols</li>
                <li>• Log out when working from shared workstations</li>
              </ul>
            </Card>
          </div>
        </div>
      </PageWrapper>
    </AdminLayout>
  );
}
