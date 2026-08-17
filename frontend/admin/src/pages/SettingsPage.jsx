import React, { useEffect, useState } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import PageWrapper, { PageHeader } from '../../../src/components/PageWrapper';
import { Card, Badge, Button } from '../../../src/components/ui/index.jsx';
import { getSettings, updateSettings } from '../services/adminAPI';

export default function SettingsPage() {
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

  return (
    <AdminLayout>
      <PageWrapper className="space-y-8">
        <PageHeader
          title="System Settings"
          subtitle="Configure global application parameters, notification rules, and maintenance state."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
            >
              <Save className="h-4 w-4" />
              Save Configuration
            </Button>
          }
        />

        {saved && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 font-semibold">
            System settings saved successfully!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Platform Identity
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Application Name
                </label>
                <input
                  type="text"
                  value={settings?.app_name || 'CattleSense'}
                  onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Release Version
                  </label>
                  <input
                    type="text"
                    value={settings?.version || '2.4.0'}
                    readOnly
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Max Upload Size (MB)
                  </label>
                  <input
                    type="number"
                    value={settings?.max_upload_size_mb || 50}
                    onChange={(e) => setSettings({ ...settings, max_upload_size_mb: parseInt(e.target.value, 10) || 50 })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Operational Switches
              </h3>

              <label className="flex items-center gap-3 p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings?.notifications_enabled || false}
                  onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">In-App Health Notifications</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Push critical notices regarding livestock disease alerts</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings?.maintenance_mode || false}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 accent-amber-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Maintenance Mode</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Temporarily restrict farmer logins during core system maintenance</p>
                </div>
              </label>
            </Card>
          </div>

          {/* System Health */}
          <div className="space-y-6">
            <Card className="p-6 space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Server Telemetry
              </h3>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">Database Engine</span>
                <Badge variant="success">PostgreSQL Live</Badge>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-800 dark:text-blue-300">AI Models</span>
                <Badge variant="info">4 Active</Badge>
              </div>
            </Card>
          </div>
        </div>
      </PageWrapper>
    </AdminLayout>
  );
}
