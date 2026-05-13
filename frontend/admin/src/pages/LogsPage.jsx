import React, { useEffect, useState } from 'react';
import { FileText, Search, Filter } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import { Card } from '../components/Card';
import { AdminPageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { getDetectionLogs } from '../services/adminAPI';

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    module: '',
    result: '',
    user_id: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await getDetectionLogs(page, 20, filters);
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'module_name', label: 'Module' },
    { key: 'user_id', label: 'User ID' },
    { key: 'cow_id', label: 'Cow ID' },
    {
      key: 'result',
      label: 'Result',
      render: (result) => (
        <Badge
          text={result.charAt(0).toUpperCase() + result.slice(1)}
          variant={result === 'positive' ? 'danger' : result === 'negative' ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'confidence',
      label: 'Confidence',
      render: (confidence) => confidence ? `${(confidence * 100).toFixed(1)}%` : 'N/A',
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader title="Detection Logs" subtitle="View all disease detection sessions" />

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search module..."
            value={filters.module}
            onChange={(e) => {
              setFilters({ ...filters, module: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />

          <select
            value={filters.result}
            onChange={(e) => {
              setFilters({ ...filters, result: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">All Results</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="inconclusive">Inconclusive</option>
          </select>

          <input
            type="number"
            placeholder="User ID..."
            value={filters.user_id}
            onChange={(e) => {
              setFilters({ ...filters, user_id: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={() => {
              setFilters({ module: '', result: '', user_id: '' });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
        />

        {/* Pagination */}
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / 20) }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded ${
                page === i + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </Card>
    </AdminLayout>
  );
};

export default LogsPage;
