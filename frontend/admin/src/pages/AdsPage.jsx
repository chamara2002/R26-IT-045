import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Calendar } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import { Card } from '../components/Card';
import { AdminPageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { getAds, createAd, updateAd, deleteAd } from '../services/adminAPI';

const AdsPage = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAd, setSelectedAd] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link: '',
    status: 'active',
    scheduled_start: '',
    scheduled_end: '',
  });

  const fetchAds = async () => {
    setLoading(true);
    try {
      const response = await getAds(page, 20, statusFilter);
      setAds(response.data.ads);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch ads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const fetchUsers = async () => {
    try {
      const response = await getAds(page, 20, statusFilter);
      setAds(response.data.ads);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch ads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedAd(null);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      link: '',
      status: 'active',
      scheduled_start: '',
      scheduled_end: '',
    });
    setIsFormOpen(true);
  };

  const handleEdit = (ad) => {
    setSelectedAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description || '',
      image_url: ad.image_url || '',
      link: ad.link || '',
      status: ad.status,
      scheduled_start: ad.scheduled_start || '',
      scheduled_end: ad.scheduled_end || '',
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedAd) {
        await updateAd(selectedAd.id, formData);
      } else {
        await createAd(formData);
      }
      setIsFormOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to save ad:', err);
    }
  };

  const handleDelete = (ad) => {
    setSelectedAd(ad);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteAd(selectedAd.id);
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete ad:', err);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <Badge
          text={status.charAt(0).toUpperCase() + status.slice(1)}
          variant={status === 'active' ? 'success' : status === 'scheduled' ? 'info' : 'default'}
        />
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  const actions = [
    {
      label: 'Edit',
      onClick: handleEdit,
      className: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      label: 'Delete',
      onClick: handleDelete,
      className: 'bg-red-600 hover:bg-red-700',
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader title="Advertisements" subtitle="Manage ads and scheduling" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <p className="text-gray-600 text-sm mb-1">Total Ads</p>
          <p className="text-3xl font-bold text-gray-900">{total}</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm mb-1">Active</p>
          <p className="text-3xl font-bold text-green-600">{ads.filter(a => a.status === 'active').length}</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm mb-1">Scheduled</p>
          <p className="text-3xl font-bold text-blue-600">{ads.filter(a => a.status === 'scheduled').length}</p>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <Button variant="primary" onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={20} />
            Create Ad
          </Button>
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          data={ads}
          actions={actions}
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

      {/* Ad Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedAd ? 'Edit Ad' : 'Create New Ad'}
        onConfirm={handleSave}
        confirmText={selectedAd ? 'Update' : 'Create'}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          {formData.status === 'scheduled' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_start}
                  onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_end}
                  onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Ad"
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        isDangerous
      >
        <p className="text-gray-700">
          Are you sure you want to delete <strong>{selectedAd?.title}</strong>?
        </p>
      </Modal>
    </AdminLayout>
  );
};

export default AdsPage;
