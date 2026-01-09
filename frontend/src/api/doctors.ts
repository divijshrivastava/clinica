import apiClient from './client'

export interface Doctor {
  id: string
  hospital_id: string
  email: string
  phone?: string
  full_name: string
  role: string
  registration_number?: string
  specialization?: string
  department?: string
  is_active: boolean
  created_at: string
  updated_at: string
  stats?: {
    total_visits: number
    scheduled_visits: number
    total_patients: number
    upcoming_appointments: number
  }
}

export interface DoctorListResponse {
  data: Doctor[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export const doctorsApi = {
  list: async (params?: {
    limit?: number
    offset?: number
  }): Promise<DoctorListResponse> => {
    const response = await apiClient.get<DoctorListResponse>('/doctors', { params })
    return response.data
  },

  get: async (id: string): Promise<Doctor> => {
    const response = await apiClient.get<Doctor>(`/doctors/${id}`)
    return response.data
  },
}
