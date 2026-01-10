import apiClient from './client'

export interface DoctorProfile {
  id: string
  hospital_id: string
  user_id: string
  display_name: string
  salutation?: string
  bio?: string
  profile_image_url?: string
  years_of_experience?: number
  registration_number?: string
  license_number?: string
  license_expiry_date?: string
  license_verified: boolean
  specialties: string[]
  qualifications: Array<{
    degree: string
    institution: string
    year: number
    specialization?: string
  }>
  languages: string[]
  consultation_modes: ('in_person' | 'tele_consultation' | 'both')[]
  status: 'draft' | 'pending_verification' | 'active' | 'inactive'
  is_bookable: boolean
  accepts_online_bookings: boolean
  public_profile_visible: boolean
  bookability_score: number
  consultation_fee?: number
  follow_up_fee?: number
  tele_consultation_fee?: number
  currency: string
  tags: string[]
  departments?: Array<{
    department_id: string
    department_name: string
    allocation_percentage: number
    is_primary: boolean
  }>
  locations?: Array<{
    location_id: string
    location_name: string
    is_primary: boolean
  }>
  created_at: string
  updated_at: string
}

export interface DoctorProfileListResponse {
  data: DoctorProfile[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export interface CreateDoctorProfilePayload {
  user_id: string
  display_name?: string
  salutation?: string
  bio?: string
  profile_image_url?: string
  years_of_experience?: number
  registration_number?: string
  license_number?: string
  license_expiry_date?: string
  specialties: string[]
  qualifications: Array<{
    degree: string
    institution: string
    year: number
    specialization?: string
  }>
  languages?: string[]
  consultation_modes?: ('in_person' | 'tele_consultation' | 'both')[]
  consultation_fee?: number
  follow_up_fee?: number
  tele_consultation_fee?: number
  tags?: string[]
}

export interface UpdateDoctorFeesPayload {
  consultation_fee?: number
  follow_up_fee?: number
  tele_consultation_fee?: number
  currency?: string
}

export interface BookabilityCheck {
  is_bookable: boolean
  bookability_score: number
  can_show_in_search: boolean
  can_patient_book: boolean
  can_receptionist_book: boolean
  blockers: string[]
  warnings: string[]
  preconditions: {
    profile_complete: boolean
    license_verified: boolean
    fees_configured: boolean
    location_assigned: boolean
    specialty_defined: boolean
    base_schedule_exists: boolean
    slots_available: boolean
    no_critical_failures: boolean
    status_active: boolean
    no_forced_blocks: boolean
  }
}

export const doctorProfilesApi = {
  list: async (params?: {
    limit?: number
    offset?: number
    status?: string
    specialty?: string
    location_id?: string
    is_bookable?: boolean
  }): Promise<DoctorProfileListResponse> => {
    const response = await apiClient.get<DoctorProfileListResponse>('/doctor-profiles', { params })
    return response.data
  },

  get: async (id: string): Promise<DoctorProfile> => {
    const response = await apiClient.get<DoctorProfile>(`/doctor-profiles/${id}`)
    return response.data
  },

  create: async (payload: CreateDoctorProfilePayload): Promise<any> => {
    const command_id = crypto.randomUUID()
    const idempotency_key = `create-doctor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const response = await apiClient.post('/doctor-profiles', payload, {
      headers: {
        'Idempotency-Key': idempotency_key,
      },
    })
    return response.data
  },

  updateFees: async (id: string, payload: UpdateDoctorFeesPayload): Promise<any> => {
    const response = await apiClient.put(`/doctor-profiles/${id}/fees`, payload, {
      headers: {
        'Idempotency-Key': `update-fees-${id}-${Date.now()}`,
      },
    })
    return response.data
  },

  assignToDepartment: async (id: string, payload: {
    department_id: string
    allocation_percentage?: number
    is_primary?: boolean
  }): Promise<any> => {
    const response = await apiClient.post(`/doctor-profiles/${id}/departments`, payload, {
      headers: {
        'Idempotency-Key': `assign-dept-${id}-${Date.now()}`,
      },
    })
    return response.data
  },

  assignToLocation: async (id: string, payload: {
    location_id: string
    is_primary?: boolean
  }): Promise<any> => {
    const response = await apiClient.post(`/doctor-profiles/${id}/locations`, payload, {
      headers: {
        'Idempotency-Key': `assign-loc-${id}-${Date.now()}`,
      },
    })
    return response.data
  },

  activate: async (id: string, payload?: {
    is_bookable?: boolean
    accepts_online_bookings?: boolean
    public_profile_visible?: boolean
    bookability_score?: number
  }): Promise<any> => {
    const response = await apiClient.post(`/doctor-profiles/${id}/activate`, payload || {}, {
      headers: {
        'Idempotency-Key': `activate-${id}-${Date.now()}`,
      },
    })
    return response.data
  },

  checkBookability: async (id: string): Promise<BookabilityCheck> => {
    const response = await apiClient.get<BookabilityCheck>(`/doctor-profiles/${id}/bookability`)
    return response.data
  },

  regenerateSlots: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/doctor-profiles/${id}/regenerate-slots`)
    return response.data
  },
}
