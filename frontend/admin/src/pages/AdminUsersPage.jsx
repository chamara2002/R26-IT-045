import React, { useState, useEffect } from 'react';
import { Mail, Check, X, UserPlus, Trash2, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import PageWrapper, { PageHeader } from '../../../src/components/PageWrapper';
import { Card, Badge, Button, Modal, Skeleton } from '../../../src/components/ui/index.jsx';
import {
  getAdmins,
  getAdminInvites,
  createAdminInvite,
  approveAdminInvite,
  rejectAdminInvite,
  deleteAdmin,
} from '../services/adminAPI';

export default function AdminUsersPage() {
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

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteFormData.email.trim() || !inviteFormData.name.trim()) return;

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
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (inviteId) => {
    try {
      await approveAdminInvite(inviteId);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve invite');
    }
  };

  const handleReject = async (inviteId) => {
    try {
      await rejectAdminInvite(inviteId);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject invite');
    }
  };

  const handleDelete = async (adminId) => {
    try {
      await deleteAdmin(adminId);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete admin');
    }
  };

  return (
    <AdminLayout>
      <PageWrapper className="space-y-8">
        <PageHeader
          title="Admin Team & Access"
          subtitle="Manage administrative personnel and approve registration invites."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInviteFormOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Invite Admin
            </Button>
          }
        />

        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 font-semibold">
            {successMessage}
          </div>
        )}

        {/* Current Admins */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Active Administrators ({admins.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/70">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Admin Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{admin.name}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{admin.email}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="danger">Admin</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setDeleteConfirm(admin)}
                        className="px-2 py-1 text-xs rounded-lg font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pending Invites */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Pending Admin Invites ({invites.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/70">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Invited Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invites.length > 0 ? (
                  invites.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{inv.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{inv.email}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant="warning">{inv.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(inv.id)}
                            className="px-2 py-1 text-xs rounded-lg font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(inv.id)}
                            className="px-2 py-1 text-xs rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500 dark:text-slate-400">
                      No pending admin invites.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Invite Modal */}
        <Modal
          isOpen={inviteFormOpen}
          onClose={() => setInviteFormOpen(false)}
          title="Invite New Administrator"
          size="md"
        >
          <form onSubmit={handleInviteSubmit} className="space-y-3 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={inviteFormData.name}
                onChange={(e) => setInviteFormData({ ...inviteFormData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Dr. Samantha Silva"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={inviteFormData.email}
                onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="admin@cattlesense.com"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="secondary" onClick={() => setInviteFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Revoke Admin Access"
          size="sm"
        >
          <p className="text-slate-700 dark:text-slate-300 text-sm mb-4">
            Are you sure you want to remove admin access for <strong>{deleteConfirm?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm?.id)}>
              Revoke Access
            </Button>
          </div>
        </Modal>
      </PageWrapper>
    </AdminLayout>
  );
}
