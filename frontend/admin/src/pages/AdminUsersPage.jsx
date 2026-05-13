import React, { useState, useEffect } from 'react';
import { Mail, Check, X, UserPlus, Trash2, Clock, AlertCircle } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import { Card } from '../components/Card';
import { AdminPageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import {
  getAdmins,
  getAdminInvites,
  createAdminInvite,
  approveAdminInvite,
  rejectAdminInvite,
  deleteAdmin,
} from '../services/adminAPI';

const AdminUsersPage = () => {
  const [admins, setAdmins] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    name: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [adminsRes, invitesRes] = await Promise.all([
        getAdmins(),
        getAdminInvites(),
      ]);

      setAdmins(adminsRes.data.admins || []);
      setInvites(invitesRes.data.invites || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin data');
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateInviteForm = () => {
    const errors = {};
    
    if (!inviteFormData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteFormData.email)) {
      errors.email = 'Invalid email format';
    } else if (admins.some(a => a.email === inviteFormData.email.toLowerCase())) {
      errors.email = 'User already exists as admin';
    }

    if (!inviteFormData.name.trim()) {
      errors.name = 'Name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();

    if (!validateInviteForm()) return;

    try {
      setSubmitting(true);
      await createAdminInvite({
        email: inviteFormData.email.toLowerCase().trim(),
        name: inviteFormData.name.trim(),
      });

      setSuccessMessage('Admin invitation sent successfully');
      setInviteFormData({ email: '', name: '' });
      setInviteFormOpen(false);
      setTimeout(() => setSuccessMessage(''), 3000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation');
      console.error('Error sending invitation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveInvite = async (inviteId) => {
    try {
      await approveAdminInvite(inviteId);
      setSuccessMessage('Invitation approved');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve invitation');
      console.error('Error approving invitation:', err);
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      await rejectAdminInvite(inviteId);
      setSuccessMessage('Invitation rejected');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject invitation');
      console.error('Error rejecting invitation:', err);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteAdmin(deleteConfirm.id);
      setSuccessMessage('Admin account removed');
      setTimeout(() => setSuccessMessage(''), 3000);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove admin');
      console.error('Error removing admin:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'expired':
        return 'bg-slate-50 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6 text-slate-900">Admin Users</h1>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="h-64 bg-slate-100 animate-pulse" />
            <Card className="h-64 bg-slate-100 animate-pulse" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
      <AdminPageHeader
        title="Admin Users"
        subtitle="Manage administrator accounts and invitations"
      />

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-emerald-700">{successMessage}</p>
        </div>
      )}

      {/* Invite Button */}
      <div className="mb-8">
        <Button
          onClick={() => setInviteFormOpen(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Invite New Admin
        </Button>
      </div>

      {/* Invite Form Modal */}
      <Modal
        isOpen={inviteFormOpen}
        onClose={() => {
          setInviteFormOpen(false);
          setFormErrors({});
        }}
        title="Invite New Admin"
      >
        {inviteFormOpen && (
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={inviteFormData.email}
                onChange={(e) =>
                  setInviteFormData({
                    ...inviteFormData,
                    email: e.target.value,
                  })
                }
                className={`w-full px-4 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  formErrors.email ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="admin@example.com"
              />
              {formErrors.email && (
                <p className="text-red-600 text-sm mt-1">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={inviteFormData.name}
                onChange={(e) =>
                  setInviteFormData({
                    ...inviteFormData,
                    name: e.target.value,
                  })
                }
                className={`w-full px-4 py-2 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  formErrors.name ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="John Doe"
              />
              {formErrors.name && (
                <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setInviteFormOpen(false);
                  setFormErrors({});
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove Admin"
        onConfirm={handleDeleteAdmin}
        confirmText="Remove"
        isDangerous
      >
        <p className="text-slate-600">
          Are you sure you want to remove <strong>{deleteConfirm?.name}</strong> as an admin?
        </p>
        <p className="text-red-600 text-sm mt-2">This action cannot be undone.</p>
      </Modal>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card.Stat
          label="Total Admins"
          value={admins.length}
          icon={UserPlus}
          color="emerald"
        />
        <Card.Stat
          label="Pending Invites"
          value={invites.filter((i) => i.status === 'pending').length}
          icon={Clock}
          color="amber"
        />
        <Card.Stat
          label="Total Invitations"
          value={invites.length}
          icon={Mail}
          color="slate"
        />
      </div>

      {/* Admin Users Table */}
      <Card className="mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">Current Admins</h2>
          {admins.length === 0 ? (
            <p className="text-slate-500">No admin users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900">{admin.name}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-slate-600">{admin.email}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge label="Admin" color="emerald" />
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-slate-600">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setDeleteConfirm(admin)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-2xl transition"
                          title="Remove admin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">Pending Invitations</h2>
          {invites.filter((i) => i.status === 'pending').length === 0 ? (
            <p className="text-slate-500">No pending invitations.</p>
          ) : (
            <div className="space-y-3">
              {invites
                .filter((i) => i.status === 'pending')
                .map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{invite.name}</p>
                      <p className="text-sm text-slate-600">{invite.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Sent{' '}
                        {new Date(invite.created_at).toLocaleDateString()}
                        {' • '}
                        Expires{' '}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleApproveInvite(invite.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-2xl transition"
                        title="Approve invitation"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectInvite(invite.id)}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-2xl transition"
                        title="Reject invitation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </Card>

      {/* Invitation History */}
      {invites.some((i) => ['approved', 'completed', 'rejected', 'expired'].includes(i.status)) && (
        <Card className="mt-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">Invitation History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Name / Email
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invites
                    .filter((i) => !['pending'].includes(i.status))
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map((invite) => (
                      <tr key={invite.id}>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-900">{invite.name}</p>
                          <p className="text-slate-600">{invite.email}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            label={invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                            color={
                              invite.status === 'completed'
                                ? 'emerald'
                                : invite.status === 'rejected'
                                  ? 'red'
                                  : invite.status === 'approved'
                                    ? 'emerald'
                                    : 'slate'
                            }
                          />
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {new Date(invite.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsersPage;
