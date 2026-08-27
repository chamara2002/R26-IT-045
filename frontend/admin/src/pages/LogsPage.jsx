import React, { useEffect, useState } from 'react';
import { Activity, Search, Filter } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import PageWrapper, { PageHeader } from '../../../src/components/PageWrapper';
import { Card, Badge, Button, Skeleton } from '../../../src/components/ui/index.jsx';
import { getDetectionLogs } from '../services/adminAPI';

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

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    module: '',
    result: '',
    user_id: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await getDetectionLogs(page, 20, filters);
      setLogs(response.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  return (
    <AdminLayout>
      <PageWrapper className="space-y-8">
        <PageHeader
          title="AI Diagnostic Logs"
          subtitle="Audit trail of cattle health checks, computer vision predictions, and timestamps."
        />

        {/* Filter Controls */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Module</label>
              <select
                value={filters.module}
                onChange={(e) => { setFilters({ ...filters, module: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Modules</option>
                <option value="lumpy-skin">Lumpy Skin Disease (LSD)</option>
                <option value="foot-mouth">Foot & Mouth Disease (FMD)</option>
                <option value="eye-disease">Bovine Eye Disease</option>
                <option value="mastitis">Mastitis Assistant</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Outcome</label>
              <select
                value={filters.result}
                onChange={(e) => { setFilters({ ...filters, result: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Results</option>
                <option value="positive">Positive (Detected)</option>
                <option value="negative">Negative (Healthy)</option>
                <option value="inconclusive">Inconclusive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Farmer User ID</label>
              <input
                type="number"
                placeholder="e.g. 1"
                value={filters.user_id}
                onChange={(e) => { setFilters({ ...filters, user_id: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Module Name</th>
                  <th className="py-3 px-4">Farmer ID</th>
                  <th className="py-3 px-4">Diagnosis</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">#{log.id}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{log.module_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-bold">
                          Farmer #{log.user_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={getOutcomeBadgeVariant(log.result)}>
                          {log.result ? log.result.toUpperCase() : 'UNKNOWN'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-500 dark:text-slate-400">
                      No diagnostic logs found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </PageWrapper>
    </AdminLayout>
  );
}
