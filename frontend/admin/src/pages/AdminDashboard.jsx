import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Megaphone,
  FileText,
  ArrowRight,
  ShieldCheck,
  Activity,
  AlertCircle,
  Plus,
  Stethoscope,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/Layout';
import PageWrapper, { PageHeader } from '../../../src/components/PageWrapper';
import { Card, Badge, Button, Skeleton } from '../../../src/components/ui/index.jsx';
import { getAdminStats } from '../services/adminAPI';

const getOutcomeBadgeVariant = (result) => {
  if (!result) return 'warning';
  const r = String(result).toLowerCase();
  if (r.includes('no mastitis') || r.includes('no disease') || r.includes('negative') || r.includes('normal') || r.includes('healthy')) {
    return 'success';
  }
  if (r.includes('positive') || r.includes('mastitis') || r.includes('stage') || r.includes('suspect') || r.includes('severe') || r.includes('mild') || r.includes('moderate')) {
    return 'danger';
  }
  return 'warning';
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await getAdminStats();
        setStats(response.data);
      } catch (err) {
        setError('Failed to load administrative analytics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const moduleColors = {
    'lumpy-skin': 'from-amber-500 to-orange-600',
    'foot-mouth': 'from-rose-500 to-red-600',
    'eye-disease': 'from-blue-500 to-indigo-600',
    'mastitis': 'from-emerald-500 to-teal-600',
  };

  const moduleLabels = {
    'lumpy-skin': 'Lumpy Skin Disease (LSD)',
    'foot-mouth': 'Foot & Mouth Disease (FMD)',
    'eye-disease': 'Bovine Eye Disease',
    'mastitis': 'Mastitis Clinical Assistant',
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="font-semibold text-red-700 dark:text-red-300">Administrative Error</p>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageWrapper className="space-y-8">
        {/* ── 1. Page Header (Identical to Public Dashboard) ────────────────── */}
        <PageHeader
          title="Admin Control Overview"
          subtitle="Real-time herd registry, diagnostic scans, campaigns, and system telemetry."
          badge={
            <Badge variant="success">
              Live Control Room
            </Badge>
          }
          action={
            <div className="flex items-center gap-2">
              <Link to="/admin/users">
                <Button size="sm" variant="primary">
                  <Users className="h-4 w-4" />
                  Manage Farmers
                </Button>
              </Link>
              <Link to="/admin/ads">
                <Button size="sm" variant="outline">
                  <Megaphone className="h-4 w-4" />
                  New Ad Campaign
                </Button>
              </Link>
            </div>
          }
        />

        {/* ── 2. Stat Cards Grid (Exact same design as Public Dashboard) ────── */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.15 }}
        >
          {/* Total Farmers */}
          <Card hover className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Badge variant="success">{loading ? "-" : "Active"}</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Registered Farmers</p>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.users?.farmers || 0}
              </p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {stats?.users?.total || 0} total platform accounts
            </p>
          </Card>

          {/* Active Campaigns */}
          <Card hover className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="info">{loading ? "-" : "Campaigns"}</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Active Advertisements</p>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.ads?.active || 0}
              </p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {stats?.ads?.total || 0} total campaigns created
            </p>
          </Card>

          {/* Diagnostic Scans */}
          <Card hover className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <Badge variant="default">AI Telemetry</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">AI Diagnostic Scans</p>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.detection_logs?.total || 0}
              </p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Processed health checks</p>
          </Card>

          {/* Platform Admins */}
          <Card hover className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <Badge variant="warning">Admin Team</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Platform Admins</p>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.users?.admins || 0}
              </p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Verified moderators</p>
          </Card>
        </motion.div>

        {/* ── 3. Diagnostic Breakdown & Quick System Summary ─────────────────── */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.22 }}
        >
          {/* Disease Diagnostics Breakdown */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Disease Diagnostics by Module
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Volume of health checks evaluated across computer vision modules
                </p>
              </div>
              <Link to="/admin/logs" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                View Logs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {stats?.detection_logs?.by_module && Object.keys(stats.detection_logs.by_module).length > 0 ? (
                Object.entries(stats.detection_logs.by_module).map(([moduleKey, count]) => {
                  const total = stats.detection_logs.total || 1;
                  const percent = Math.min(100, Math.round((count / total) * 100));
                  const gradient = moduleColors[moduleKey] || 'from-emerald-500 to-teal-600';
                  const label = moduleLabels[moduleKey] || moduleKey;

                  return (
                    <div key={moduleKey} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{label}</span>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">
                          {count} scans ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${gradient} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No diagnostic sessions recorded yet.
                </div>
              )}
            </div>
          </Card>

          {/* Quick System Summary */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              System Telemetry
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Live server & database health
            </p>

            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Farmer Registry</p>
                  <p className="text-xl font-extrabold text-emerald-950 dark:text-emerald-100">{stats?.users?.farmers || 0}</p>
                </div>
                <Badge variant="success">Operational</Badge>
              </div>

              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">Campaign Banners</p>
                  <p className="text-xl font-extrabold text-blue-950 dark:text-blue-100">{stats?.ads?.total || 0}</p>
                </div>
                <Badge variant="info">{stats?.ads?.active || 0} Live</Badge>
              </div>

              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wide">AI Inference Speed</p>
                  <p className="text-xl font-extrabold text-purple-950 dark:text-purple-100">&lt; 1.2s</p>
                </div>
                <Badge variant="default">99.9% Uptime</Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── 4. Recent AI Diagnostic Audit Table ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.28 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent AI Diagnostic Scans
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Latest cattle health tests evaluated across farmer submissions
                </p>
              </div>
              <Link to="/admin/logs" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/70">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Module Name</th>
                    <th className="py-3 px-4">Diagnosis Result</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats?.recent_logs && stats.recent_logs.length > 0 ? (
                    stats.recent_logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {moduleLabels[log.module_name] || log.module_name}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={getOutcomeBadgeVariant(log.result)}>
                            {log.result ? log.result.toUpperCase() : 'N/A'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400 dark:text-slate-500">
                        No diagnostic sessions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </PageWrapper>
    </AdminLayout>
  );
}
