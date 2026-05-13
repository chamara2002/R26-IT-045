import React, { useEffect, useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import { Card } from '../components/Card';
import { AdminPageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { AlertBox } from '../components/Badge';
import { getSettings, updateSettings } from '../services/adminAPI';

const SettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await getSettings();
        setSettings(response.data);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminPageHeader title="System Settings" subtitle="Configure application settings and preferences" />

      {saved && (
        <AlertBox
          type="success"
          message="Settings saved successfully!"
          onClose={() => setSaved(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Settings */}
          <Card title="Application Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Name
                </label>
                <input
                  type="text"
                  value={settings?.app_name || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, app_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version
                </label>
                <input
                  type="text"
                  value={settings?.version || ''}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Upload Size (MB)
                </label>
                <input
                  type="number"
                  value={settings?.max_upload_size_mb || 50}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_upload_size_mb: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card title="Notification Settings">
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.notifications_enabled || false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications_enabled: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Enable Notifications</p>
                  <p className="text-sm text-gray-600">
                    Send in-app notifications for important events
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.email_notifications || false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email_notifications: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">
                    Send email notifications for critical alerts
                  </p>
                </div>
              </label>
            </div>
          </Card>

          {/* System Settings */}
          <Card title="System Settings">
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.maintenance_mode || false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maintenance_mode: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Maintenance Mode</p>
                  <p className="text-sm text-gray-600">
                    Temporarily take the application offline for maintenance
                  </p>
                </div>
              </label>
            </div>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card title="Info">
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Status</p>
                <p className="text-lg font-semibold text-blue-600">Active</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Version</p>
                <p className="text-lg font-semibold text-green-600">
                  {settings?.version}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Last Updated</p>
                <p className="text-lg font-semibold text-purple-600">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="space-y-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                View Site
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = '/admin/logs'}
              >
                View Logs
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end gap-4">
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Discard Changes
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          className="flex items-center gap-2"
        >
          <Save size={20} />
          Save Settings
        </Button>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;
