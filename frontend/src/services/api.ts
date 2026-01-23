import axios, { AxiosInstance } from 'axios';

// Determine API URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
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

const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used (helpful for debugging)
console.log('🌐 API Base URL:', API_BASE_URL);

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const authState = localStorage.getItem('mymedic-auth');
    if (authState) {
      try {
        const parsed = JSON.parse(authState);
        const token = parsed.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        console.error('Failed to parse auth state:', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state on 401
      localStorage.removeItem('mymedic-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: string;
    hospital_id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

export interface RegisterHospitalRequest {
  name: string;
  provider_type: 'independent_doctor' | 'small_clinic' | 'medium_clinic' | 'large_hospital';
  license_number?: string;
  license_type?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
  };
  phone?: string;
  email: string;
  timezone?: string;
  admin_user: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    role: 'admin' | 'doctor';
    registration_number?: string;
    specialization?: string;
  };
  subscription_tier?: 'starter' | 'professional' | 'enterprise';
  onboarding_data?: any;
}

export interface RegisterHospitalResponse {
  hospital_id: string;
  command_id: string;
}

export interface CreateUserRequest {
  hospital_id: string;
  email: string;
  password: string;
  full_name: string;
  role: 'doctor' | 'nurse' | 'admin' | 'receptionist' | 'lab_technician';
  phone?: string;
  registration_number?: string;
  specialization?: string;
  department?: string;
  invited_by?: string;
}

export interface CreateUserResponse {
  user_id: string;
  command_id: string;
}

// API Functions

/**
 * Login user
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', data);
  return response.data;
};

/**
 * Register a new hospital (doctor/clinic/hospital onboarding)
 */
export const registerHospital = async (
  data: RegisterHospitalRequest
): Promise<RegisterHospitalResponse> => {
  const response = await apiClient.post<RegisterHospitalResponse>('/onboarding/register-hospital', data);
  return response.data;
};

/**
 * Create a new user (for team invitations)
 */
export const createUser = async (data: CreateUserRequest): Promise<CreateUserResponse> => {
  const response = await apiClient.post<CreateUserResponse>('/onboarding/create-user', data);
  return response.data;
};

/**
 * Helper to wait for projection to be updated
 * After creating hospital/user, we need to wait for the projection to catch up
 */
export const waitForProjection = (delayMs: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
};

export default apiClient;
