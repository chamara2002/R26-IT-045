import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Megaphone, ExternalLink, Calendar } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import PageWrapper, { PageHeader } from '../../../src/components/PageWrapper';
import { Card, Badge, Button, Modal, Skeleton } from '../../../src/components/ui/index.jsx';
import { getAds, createAd, updateAd, deleteAd } from '../services/adminAPI';

export default function AdsPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAd, setSelectedAd] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [modalError, setModalError] = useState('');

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
      setAds(response.data.ads || []);
    } catch (err) {
      console.error('Failed to fetch ads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, [page, statusFilter]);

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
    setModalError('');
    setIsFormOpen(true);
  };

  const handleEdit = (ad) => {
    setSelectedAd(ad);
    setFormData({
      title: ad.title || '',
      description: ad.description || '',
      image_url: ad.image_url || '',
      link: ad.link || '',
      status: ad.status || 'active',
      scheduled_start: ad.scheduled_start ? ad.scheduled_start.substring(0, 10) : '',
      scheduled_end: ad.scheduled_end ? ad.scheduled_end.substring(0, 10) : '',
    });
    setModalError('');
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    setModalError('');
    if (!formData.title.trim()) {
      setModalError('Advertisement title is required.');
      return;
    }

    try {
      if (selectedAd) {
        await updateAd(selectedAd.id, formData);
      } else {
        await createAd(formData);
      }
      setIsFormOpen(false);
      fetchAds();
    } catch (err) {
      setModalError(err.response?.data?.error || err.message || 'Failed to save advertisement');
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
      fetchAds();
    } catch (err) {
      console.error('Failed to delete ad:', err);
    }
  };

  return (
    <AdminLayout>
      <PageWrapper className="space-y-8">
        <PageHeader
          title="Campaigns & Advertisements"
          subtitle="Manage sponsored cards, product notices, and promotions across farmer workspaces."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          }
        />

        {/* Filter Card */}
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Campaigns</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </Card>

        {/* Campaigns Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Campaign Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Link URL</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500">#{ad.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{ad.title}</div>
                      {ad.description && <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{ad.description}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={ad.status === 'active' ? 'success' : 'default'}>
                        {ad.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {ad.link ? (
                        <a
                          href={ad.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium text-xs"
                        >
                          Visit Link <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(ad.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(ad)}
                          className="px-2 py-1 text-xs rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(ad)}
                          className="px-2 py-1 text-xs rounded-lg font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal */}
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={selectedAd ? 'Edit Campaign Banner' : 'Create Campaign Banner'}
          size="md"
        >
          {modalError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {modalError}
            </div>
          )}

          <div className="space-y-3 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Mineral Supplement Discount"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Campaign details..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Click URL</label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="https://sponsor.lk/dairy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Save Campaign
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          title="Delete Campaign"
          size="sm"
        >
          <p className="text-slate-700 dark:text-slate-300 text-sm mb-4">
            Are you sure you want to delete <strong>{selectedAd?.title}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </Modal>
      </PageWrapper>
    </AdminLayout>
  );
}
