import apiClient from './client'

export interface Patient {
  id: string
  hospital_id: string
  mrn: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  phone: string
  email?: string
  whatsapp_phone?: string
  whatsapp_opted_in: boolean
  address?: any
  current_version: number
  created_at: string
  updated_at: string
}

export interface PatientListResponse {
  data: Patient[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export interface RegisterPatientPayload {
  mrn?: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  phone: string
  email?: string
  whatsapp_phone?: string
  whatsapp_opted_in?: boolean
  address?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  }
}

export const patientsApi = {
  list: async (params?: {
    limit?: number
    offset?: number
    search?: string
  }): Promise<PatientListResponse> => {
    const response = await apiClient.get<PatientListResponse>('/patients', { params })
    return response.data
  },

  get: async (id: string): Promise<Patient> => {
    const response = await apiClient.get<Patient>(`/patients/${id}`)
    return response.data
  },

  register: async (payload: RegisterPatientPayload): Promise<any> => {
    // Generate unique IDs for the command
    const command_id = crypto.randomUUID()
    const idempotency_key = `register-patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const response = await apiClient.post('/commands/register-patient', {
      command_id,
      idempotency_key,
      payload,
    })
    return response.data
  },

  updateContact: async (id: string, payload: {
    phone?: string
    email?: string
    whatsapp_phone?: string
    whatsapp_opted_in?: boolean
    address?: any
  }): Promise<any> => {
    const response = await apiClient.post('/commands/update-patient-contact', {
      aggregate_id: id,
      payload,
    })
    return response.data
  },

  updateDemographics: async (id: string, payload: {
    first_name?: string
    last_name?: string
    date_of_birth?: string
    gender?: string
  }): Promise<any> => {
    const response = await apiClient.post('/commands/update-patient-demographics', {
      aggregate_id: id,
      payload,
    })
    return response.data
  },

  getTimeline: async (id: string, params?: {
    limit?: number
    offset?: number
  }): Promise<any> => {
    const response = await apiClient.get(`/patients/${id}/timeline`, { params })
    return response.data
  },
}

