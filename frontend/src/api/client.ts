import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// Determine API URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  }

  // If running on production domain, use production API
  if (window.location.hostname === 'mymedic.life' || window.location.hostname === 'www.mymedic.life') {
    return 'https://api.mymedic.life';
  }

  // If running on Vercel preview/production deployments
  if (window.location.hostname.includes('vercel.app')) {
    return 'https://api.mymedic.life';
  }

  // Default to localhost for local development
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl()

// Log the API URL being used (helpful for debugging)
console.log('🌐 API Base URL:', API_BASE_URL)

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    const user = useAuthStore.getState().user

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (user?.hospital_id) {
      config.headers['X-Hospital-ID'] = user.hospital_id
    }

    if (user?.user_id) {
      config.headers['X-User-ID'] = user.user_id
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient

