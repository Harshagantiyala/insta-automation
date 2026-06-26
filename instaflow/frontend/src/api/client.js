import axios from 'axios';

// Set VITE_API_URL in frontend/.env when the backend isn't on localhost:4000.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('instaflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('instaflow_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
