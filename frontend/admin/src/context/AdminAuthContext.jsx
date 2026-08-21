import React, { createContext, useState, useContext, useEffect } from 'react';
import { setAdminAuthToken } from '../services/adminAPI';

const AdminAuthContext = createContext();

const parseStoredJson = (rawValue) => {
  if (!rawValue) return null;
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

const getInitialAdminSession = () => {
  const storedAdmin = parseStoredJson(localStorage.getItem('admin_user'));
  const storedAdminToken = localStorage.getItem('admin_token') || '';

  if (storedAdmin?.role === 'admin' && storedAdminToken) {
    return { admin: storedAdmin, token: storedAdminToken };
  }

  const appUser = parseStoredJson(localStorage.getItem('cattlesense_user'));
  const appToken = localStorage.getItem('cattlesense_token') || '';

  if (appUser?.role === 'admin' && appToken) {
    return { admin: appUser, token: appToken };
  }

  return { admin: null, token: '' };
};

export const AdminAuthProvider = ({ children }) => {
  const initialSession = getInitialAdminSession();
  const [admin, setAdmin] = useState(initialSession.admin);
  const [token, setToken] = useState(initialSession.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      localStorage.setItem('admin_token', token);
      localStorage.setItem('cattlesense_token', token);
      setAdminAuthToken(token);
    } else {
      localStorage.removeItem('admin_token');
      setAdminAuthToken('');
    }
  }, [token]);

  useEffect(() => {
    if (admin) {
      localStorage.setItem('admin_user', JSON.stringify(admin));
      localStorage.setItem('cattlesense_user', JSON.stringify(admin));
    } else {
      localStorage.removeItem('admin_user');
    }
  }, [admin]);

  useEffect(() => {
    const bootstrapSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || data?.user?.role !== 'admin') {
          throw new Error('Admin session is not valid');
        }

        setAdmin(data.user);
      } catch {
        setAdmin(null);
        setToken('');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_token');
      } finally {
        setLoading(false);
      }
    };

    bootstrapSession();
  }, [token]);

  const login = async (identifier, password) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, email: identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Check if user is admin
      if (data.user.role !== 'admin') {
        throw new Error('Admin access required');
      }

      setToken(data.token);
      setAdmin(data.user);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAdmin(null);
    setToken('');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('cattlesense_user');
    localStorage.removeItem('cattlesense_token');
    setAdminAuthToken('');
  };

  const isAdmin = admin && admin.role === 'admin';
  const isAuthenticated = !!token && !!admin && admin.role === 'admin';

  return (
    <AdminAuthContext.Provider value={{
      admin,
      token,
      loading,
      error,
      login,
      logout,
      isAdmin,
      isAuthenticated,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};
