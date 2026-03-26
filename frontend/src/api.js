import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const uploadCsv = (formData) =>
  api.post('/upload/csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const uploadProductImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default api;
