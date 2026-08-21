import axios from 'axios';

const API_BASE_URL = '/api';

let adminToken = '';

export const setAdminAuthToken = (token) => {
  adminToken = token;
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

const adminAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminAPI.interceptors.request.use((config) => {
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  return config;
});

adminAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('cattlesense_token');
      localStorage.removeItem('cattlesense_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// USERS
export const getUsers = (page = 1, perPage = 20, search = '', role = '') => {
  const params = { page, per_page: perPage };
  if (search) params.search = search;
  if (role) params.role = role;
  return adminAPI.get('/admin/users', { params });
};

export const getUser = (userId) => {
  return adminAPI.get(`/admin/users/${userId}`);
};

export const updateUser = (userId, data) => {
  return adminAPI.put(`/admin/users/${userId}`, data);
};

export const deleteUser = (userId) => {
  return adminAPI.delete(`/admin/users/${userId}`);
};

// ADS
export const getAds = (page = 1, perPage = 20, status = '') => {
  const params = { page, per_page: perPage };
  if (status) params.status = status;
  return adminAPI.get('/admin/ads', { params });
};

export const getAd = (adId) => {
  return adminAPI.get(`/admin/ads/${adId}`);
};

export const createAd = (data) => {
  return adminAPI.post('/admin/ads', data);
};

export const updateAd = (adId, data) => {
  return adminAPI.put(`/admin/ads/${adId}`, data);
};

export const deleteAd = (adId) => {
  return adminAPI.delete(`/admin/ads/${adId}`);
};

export const uploadAdImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return adminAPI.post('/admin/ads/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// DETECTION LOGS
export const getDetectionLogs = (page = 1, perPage = 20, filters = {}) => {
  const params = { page, per_page: perPage, ...filters };
  return adminAPI.get('/admin/logs', { params });
};

export const getDetectionLog = (logId) => {
  return adminAPI.get(`/admin/logs/${logId}`);
};

// DASHBOARD
export const getAdminStats = () => {
  return adminAPI.get('/admin/stats');
};

// SETTINGS
export const getSettings = () => {
  return adminAPI.get('/admin/settings');
};

export const updateSettings = (settings) => {
  return adminAPI.put('/admin/settings', settings);
};

// ADMIN MANAGEMENT
export const getAdmins = (page = 1, perPage = 20) => {
  const params = { page, per_page: perPage };
  return adminAPI.get('/admin/admins', { params });
};

export const getAdminInvites = (page = 1, perPage = 20, status = '') => {
  const params = { page, per_page: perPage };
  if (status) params.status = status;
  return adminAPI.get('/admin/invites', { params });
};

export const createAdminInvite = (data) => {
  return adminAPI.post('/admin/invites', data);
};

export const approveAdminInvite = (inviteId) => {
  return adminAPI.put(`/admin/invites/${inviteId}/approve`);
};

export const rejectAdminInvite = (inviteId, reason = '') => {
  return adminAPI.put(`/admin/invites/${inviteId}/reject`, { reason });
};

export const deleteAdmin = (adminId) => {
  return adminAPI.delete(`/admin/admins/${adminId}`);
};

export default adminAPI;
