import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Plus, Search } from 'lucide-react';
import { AdminLayout } from '../components/Layout';
import { Card } from '../components/Card';
import { AdminPageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { getUsers, updateUser, deleteUser } from '../services/adminAPI';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', email: '', role: 'farmer' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers(page, 20, search);
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditData({ name: user.name, email: user.email, role: user.role });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateUser(selectedUser.id, editData);
      setIsEditOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
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

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (role) => (
        <Badge
          text={role === 'admin' ? 'Admin' : 'Farmer'}
          variant={role === 'admin' ? 'danger' : 'success'}
        />
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
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
      <AdminPageHeader title="Users Management" subtitle="Manage farmers and admin accounts" />

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <Button variant="primary" className="flex items-center gap-2">
            <Plus size={20} />
            Add User
          </Button>
        </div>
      </Card>

      <Card loading={loading}>
        <DataTable
          columns={columns}
          data={users}
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

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit User"
        onConfirm={handleSaveEdit}
        confirmText="Save Changes"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={editData.email}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={editData.role}
              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="farmer">Farmer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete User"
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        isDangerous
      >
        <p className="text-gray-700">
          Are you sure you want to delete <strong>{selectedUser?.name}</strong>?
        </p>
        <p className="text-red-600 text-sm mt-2">This action cannot be undone.</p>
      </Modal>
    </AdminLayout>
  );
};

export default UsersPage;
