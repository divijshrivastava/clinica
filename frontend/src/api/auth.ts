import apiClient from './client'
import { useAuthStore } from '../store/authStore'

export interface LoginCredentials {
  email: string
  password: string
  hospital_id?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  user: {
    id: string
    email: string
    full_name: string
    role: string
    hospital_id: string
    hospital_name: string
  }
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    // For now, we'll use a mock login since the backend doesn't have auth endpoints yet
    // In production, this would call: POST /api/auth/login
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
    
    const { access_token, user } = response.data
    
    // Store in auth store
    useAuthStore.getState().login(access_token, {
      user_id: user.id,
      hospital_id: user.hospital_id,
      role: user.role as any,
      email: user.email,
    })
    
    return response.data
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    useAuthStore.getState().logout()
  },
}

