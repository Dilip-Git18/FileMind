import axios from 'axios';

const API_BASE = ''; // Proxy handles /auth, /documents, /chat in dev

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('filemind_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Endpoints
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data);

// Document Endpoints
export const uploadDocument = (formData, onProgress) =>
  api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      if (onProgress) onProgress(percent);
    },
  });

export const getDocuments = (params) => api.get('/documents', { params });
export const getDocumentById = (id) => api.get(`/documents/${id}`);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);
export const getDocumentStatus = (id) => api.get(`/documents/status/${id}`);
export const searchDocumentContent = (id, query) => api.get(`/documents/${id}/search`, { params: { query } });

// Chat Endpoints
export const getChatHistory = (params) => api.get('/chat/history', { params });
export const deleteChatHistory = (data) => api.delete('/chat/history', { data });

export default api;
