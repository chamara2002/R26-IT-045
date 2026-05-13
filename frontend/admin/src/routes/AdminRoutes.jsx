import { Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from '../pages/AdminDashboard';
import UsersPage from '../pages/UsersPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdsPage from '../pages/AdsPage';
import LogsPage from '../pages/LogsPage';
import SettingsPage from '../pages/SettingsPage';
import ProfilePage from '../pages/ProfilePage';
import { AdminProtectedRoute } from './AdminProtectedRoute';

export const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      
      {/* Protected Routes */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminProtectedRoute>
            <UsersPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/admins"
        element={
          <AdminProtectedRoute>
            <AdminUsersPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/ads"
        element={
          <AdminProtectedRoute>
            <AdsPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <AdminProtectedRoute>
            <LogsPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminProtectedRoute>
            <SettingsPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <AdminProtectedRoute>
            <ProfilePage />
          </AdminProtectedRoute>
        }
      />

      {/* Default fallback */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};
