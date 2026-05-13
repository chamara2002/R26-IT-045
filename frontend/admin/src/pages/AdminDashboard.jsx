import React, { useEffect, useState } from 'react';
import { Users, BarChart3, Megaphone, FileText } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import { Card, StatCard } from '../components/Card';
import { AdminPageHeader } from '../components/PageHeader';
import { getAdminStats } from '../services/adminAPI';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getAdminStats();
        setStats(response.data);
      } catch (err) {
        setError('Failed to load statistics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <AdminPageHeader title="Dashboard" subtitle="Welcome to CattleSense Admin Panel" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <LoadingSkeleton rows={10} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminPageHeader title="Dashboard" subtitle="Welcome to CattleSense Admin Panel" />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Users"
          value={stats?.users?.total || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Admin Users"
          value={stats?.users?.admins || 0}
          icon={BarChart3}
          color="green"
        />
        <StatCard
          label="Active Ads"
          value={stats?.ads?.active || 0}
          icon={Megaphone}
          color="amber"
        />
        <StatCard
          label="Detection Logs"
          value={stats?.detection_logs?.total || 0}
          icon={FileText}
          color="red"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Performance */}
        <Card title="Detection by Module" className="lg:col-span-2">
          <div className="space-y-3">
            {stats?.detection_logs?.by_module && Object.entries(stats.detection_logs.by_module).map(([module, count]) => (
              <div key={module} className="flex items-center justify-between">
                <span className="text-gray-700">{module}</span>
                <div className="flex items-center gap-3">
                  <div className="w-48 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(count / (stats.detection_logs.total || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="font-semibold text-gray-800 w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card title="System Overview">
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Ads</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.ads?.total || 0}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Farmer Accounts</p>
              <p className="text-2xl font-bold text-green-600">{stats?.users?.farmers || 0}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Logs</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.detection_logs?.total || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card title="Recent Detection Logs" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Module</th>
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Result</th>
                <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats?.recent_logs && stats.recent_logs.length > 0 ? (
                stats.recent_logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-800">{log.module_name}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        log.result === 'positive' 
                          ? 'bg-red-100 text-red-800' 
                          : log.result === 'negative'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {log.result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="py-6 text-center text-gray-500">
                    No logs available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
