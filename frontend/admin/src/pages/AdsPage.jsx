import React, { useEffect, useState, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Megaphone,
  ExternalLink,
  Calendar,
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  X,
  Eye,
} from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import PageWrapper, { PageHeader } from '../../../src/components/PageWrapper';
import { Card, Badge, Button, Modal, Skeleton } from '../../../src/components/ui/index.jsx';
import { getAds, createAd, updateAd, deleteAd, uploadAdImage } from '../services/adminAPI';

export default function AdsPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAd, setSelectedAd] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setModalError('Image size exceeds 5MB limit.');
      return;
    }

    setIsUploading(true);
    setModalError('');
    try {
      const res = await uploadAdImage(file);
      if (res?.data?.image_url) {
        setFormData((prev) => ({ ...prev, image_url: res.data.image_url }));
      }
    } catch (err) {
      setModalError(err.response?.data?.error || err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setModalError('');
    if (!formData.title.trim()) {
      setModalError('Advertisement title is required.');
      return;
    }

    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (ad) => {
    const nextStatus = ad.status === 'active' ? 'inactive' : 'active';
    try {
      await updateAd(ad.id, { status: nextStatus });
      fetchAds();
    } catch (err) {
      console.error('Failed to toggle status:', err);
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
          subtitle="Manage featured partner banners, product promotions, and agricultural ads on the landing page."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              className="gap-2 rounded-xl text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          }
        />

        {/* Filter Bar */}
        <Card className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Total Campaigns: {ads.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Campaigns Table */}
        <Card className="p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Banner</th>
                  <th className="py-3 px-4">Campaign Title & Info</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Target Partner Link</th>
                  <th className="py-3 px-4">Date Added</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                      Loading campaigns...
                    </td>
                  </tr>
                ) : ads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No advertisements found. Click <strong>New Campaign</strong> to add one.
                    </td>
                  </tr>
                ) : (
                  ads.map((ad) => (
                    <tr
                      key={ad.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Banner Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="h-12 w-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                          {ad.image_url ? (
                            <img
                              src={ad.image_url}
                              alt={ad.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src =
                                  'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=200&auto=format&fit=crop&q=60';
                              }}
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </td>

                      {/* Title & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">
                          {ad.title}
                        </div>
                        {ad.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {ad.description}
                          </div>
                        )}
                      </td>

                      {/* Status & Quick Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(ad)}
                          title={`Click to ${ad.status === 'active' ? 'pause' : 'activate'}`}
                          className="inline-flex items-center gap-1.5 transition-transform hover:scale-105"
                        >
                          <Badge variant={ad.status === 'active' ? 'success' : 'default'}>
                            {ad.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </td>

                      {/* Target Link */}
                      <td className="py-3.5 px-4">
                        {ad.link ? (
                          <a
                            href={ad.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold text-xs truncate max-w-[160px]"
                          >
                            <span>Visit URL</span>
                            <ExternalLink size={11} className="shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                        {new Date(ad.created_at).toLocaleDateString()}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(ad)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-colors"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(ad)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Create / Edit Modal with Image File Upload & Live Preview */}
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={selectedAd ? 'Edit Advertisement' : 'Create New Advertisement'}
          size="md"
        >
          {modalError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
              <X className="h-4 w-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="space-y-4 text-xs sm:text-sm">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Premium Cattle Feed & Mineral Premixes"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Offer Summary
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="Highlight key benefits for dairy farmers..."
              />
            </div>

            {/* Image Upload & URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Advertisement Banner Image
              </label>

              {/* Live Preview */}
              {formData.image_url ? (
                <div className="relative mb-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-40 group">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="mb-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center bg-slate-50 dark:bg-slate-800/40">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Uploading Image...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload Image File</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Supports JPG, PNG, WebP (Max 5MB)
                  </p>
                </div>
              )}

              {/* Direct Image URL input */}
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="Or paste external image URL (https://...)"
                />
              </div>
            </div>

            {/* Target Partner Link */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Partner Website / Click Link URL
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="https://sponsor-website.com/promotion"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Publication Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="active">Active (Visible on Landing Page)</option>
                <option value="inactive">Inactive / Paused</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={isSaving}
                onClick={handleSave}
                className="gap-1.5"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{selectedAd ? 'Update Advertisement' : 'Publish Advertisement'}</span>
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          title="Delete Advertisement"
          size="sm"
        >
          <div className="p-2 space-y-4">
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Are you sure you want to permanently delete the campaign{' '}
              <strong>"{selectedAd?.title}"</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                Delete Campaign
              </Button>
            </div>
          </div>
        </Modal>
      </PageWrapper>
    </AdminLayout>
  );
}
