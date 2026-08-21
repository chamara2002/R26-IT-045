import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Plus, Search, Eye, Phone, MapPin, Building2, Hash, Users, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import PageWrapper, { PageHeader } from '../../../src/components/PageWrapper';
import { Card, Badge, Button, Modal, Skeleton } from '../../../src/components/ui/index.jsx';
import { getUsers, updateUser, deleteUser } from '../services/adminAPI';
import { signupUser } from '../../../src/services/api';

const PROVINCES = [
  'Central', 'Eastern', 'Northern', 'North Central',
  'North Western', 'Sabaragamuwa', 'Southern', 'Uva', 'Western'
];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [editData, setEditData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'farmer',
    farm_name: '',
    province: '',
    district: '',
    ds_division: '',
    gn_division: '',
    farm_address: '',
    cattle_count: '',
    farming_experience: '',
    password: '',
  });

  const [addData, setAddData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'farmer',
    farm_name: '',
    province: 'Central',
    district: 'Kandy',
    ds_division: '',
    gn_division: '',
    farm_address: '',
    cattle_count: '10',
    farming_experience: '1 - 3 years',
  });

  const [modalError, setModalError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers(page, 20, search, roleFilter);
      setUsers(response.data.users || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);

  const handleView = (user) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditData({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role || 'farmer',
      farm_name: user.farm_name || '',
      province: user.province || '',
      district: user.district || '',
      ds_division: user.ds_division || '',
      gn_division: user.gn_division || '',
      farm_address: user.farm_address || '',
      cattle_count: user.cattle_count !== null && user.cattle_count !== undefined ? user.cattle_count : '',
      farming_experience: user.farming_experience || '',
      password: '',
    });
    setModalError('');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setModalError('');
    try {
      const payload = { ...editData };
      if (!payload.password) delete payload.password;
      await updateUser(selectedUser.id, payload);
      setIsEditOpen(false);
      fetchUsers();
    } catch (err) {
      setModalError(err.response?.data?.error || err.message || 'Failed to update user');
    }
  };

  const handleAddUser = async () => {
    setModalError('');
    try {
      if (!addData.name || !addData.phone || !addData.password) {
        setModalError('Name, Mobile Number, and Password are required.');
        return;
      }
      await signupUser({
        name: addData.name,
        phone: addData.phone,
        email: addData.email || undefined,
        password: addData.password,
        farm_name: addData.farm_name || undefined,
        province: addData.province,
        district: addData.district,
        ds_division: addData.ds_division || undefined,
        gn_division: addData.gn_division || undefined,
        farm_address: addData.farm_address || undefined,
        cattle_count: parseInt(addData.cattle_count || '1', 10),
        farming_experience: addData.farming_experience || undefined,
      });
      setIsAddOpen(false);
      fetchUsers();
    } catch (err) {
      setModalError(err.response?.data?.error || err.message || 'Failed to create user');
    }
  };

  const handleDelete = (user) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteUser(selectedUser.id);
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  return (
    <AdminLayout>
      <PageWrapper className="space-y-8">
        <PageHeader
          title="Farmers & Account Registry"
          subtitle="View and manage all registered dairy farmers, farm details, and admin users."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setModalError(''); setIsAddOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Add New User
            </Button>
          }
        />

        {/* Search and Filters Card */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by farmer name, mobile number, email, or farm name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Roles</option>
                <option value="farmer">Farmers Only</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Farmer / User</th>
                  <th className="py-3.5 px-4">Mobile & Email</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Cattle</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Registered</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan="8" className="py-4 px-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">#{user.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{user.name}</div>
                        {user.farm_name && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {user.farm_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {user.phone && (
                          <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Phone size={12} className="text-slate-400" />
                            {user.phone}
                          </div>
                        )}
                        {user.email && <div className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {user.district ? `${user.district}, ${user.province || ''}` : <span className="text-slate-400 italic">N/A</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                          <Hash size={11} /> {user.cattle_count || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={user.role === 'admin' ? 'danger' : 'success'}>
                          {user.role === 'admin' ? 'Admin' : 'Farmer'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleView(user)}
                            className="px-2 py-1 text-xs rounded-lg font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="px-2 py-1 text-xs rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="px-2 py-1 text-xs rounded-lg font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-slate-500 dark:text-slate-400">
                      No accounts matched your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* View Profile Modal */}
        <Modal
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          title={`Farmer Profile: ${selectedUser?.name}`}
          size="lg"
        >
          {selectedUser && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs text-slate-400 block">Full Name</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedUser.name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Account Role</span>
                  <Badge variant={selectedUser.role === 'admin' ? 'danger' : 'success'}>
                    {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Mobile Number</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Email Address</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.email || 'N/A'}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-xs uppercase tracking-wider">
                  Farm Profile
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-400 block">Farm Name</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.farm_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Number of Cattle</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.cattle_count || '0'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Province</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.province || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">District</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.district || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">DS Division</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.ds_division || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">GN Division</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.gn_division || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400 block">Farm Address</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.farm_address || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400 block">Farming Experience</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedUser.farming_experience || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button variant="secondary" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Farmer / User Profile"
          size="lg"
        >
          {modalError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {modalError}
            </div>
          )}

          <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select
                  value={editData.role}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                >
                  <option value="farmer">Farmer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">Farm Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Farm Name</label>
                  <input
                    type="text"
                    value={editData.farm_name}
                    onChange={(e) => setEditData({ ...editData, farm_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Number of Cattle</label>
                  <input
                    type="number"
                    value={editData.cattle_count}
                    onChange={(e) => setEditData({ ...editData, cattle_count: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Province</label>
                  <input
                    type="text"
                    value={editData.province}
                    onChange={(e) => setEditData({ ...editData, province: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">District</label>
                  <input
                    type="text"
                    value={editData.district}
                    onChange={(e) => setEditData({ ...editData, district: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reset Password (optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep unchanged"
                    value={editData.password}
                    onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

        {/* Add User Modal */}
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Create New User / Farmer"
          size="lg"
        >
          {modalError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {modalError}
            </div>
          )}

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={addData.name}
                  onChange={(e) => setAddData({ ...addData, name: e.target.value })}
                  placeholder="Kamal Perera"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={addData.phone}
                  onChange={(e) => setAddData({ ...addData, phone: e.target.value })}
                  placeholder="0771234567"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={addData.email}
                  onChange={(e) => setAddData({ ...addData, email: e.target.value })}
                  placeholder="farmer@example.com"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={addData.password}
                  onChange={(e) => setAddData({ ...addData, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddUser}>
                Create Account
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation */}
        <Modal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          title="Delete Account"
          size="sm"
        >
          <p className="text-slate-700 dark:text-slate-300 text-sm mb-4">
            Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
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
