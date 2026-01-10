import apiClient from './client'

export interface DoctorSchedule {
  id: string
  doctor_profile_id: string
  location_id: string
  day_of_week: number // 0 = Sunday, 6 = Saturday
  start_time: string // HH:MM
  end_time: string // HH:MM
  slot_duration_minutes: number
  buffer_time_minutes: number
  max_appointments_per_slot: number
  consultation_mode: 'in_person' | 'tele_consultation' | 'both'
  max_in_person_capacity: number
  max_tele_capacity: number
  effective_from: string
  effective_until?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ScheduleOverride {
  id: string
  doctor_profile_id: string
  location_id: string
  override_date: string
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_time_minutes: number
  max_appointments_per_slot: number
  consultation_mode: 'in_person' | 'tele_consultation' | 'both'
  reason?: string
  created_at: string
}

export interface CreateBaseSchedulePayload {
  doctor_profile_id: string
  location_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_time_minutes?: number
  max_appointments_per_slot?: number
  consultation_mode?: 'in_person' | 'tele_consultation' | 'both'
  max_in_person_capacity?: number
  max_tele_capacity?: number
  effective_from?: string
  effective_until?: string
}

export interface AddScheduleOverridePayload {
  doctor_profile_id: string
  location_id: string
  override_date: string
  start_time: string
  end_time: string
  slot_duration_minutes?: number
  buffer_time_minutes?: number
  max_appointments_per_slot?: number
  consultation_mode?: 'in_person' | 'tele_consultation' | 'both'
  reason?: string
}

export interface AddForcedBlockPayload {
  doctor_profile_id: string
  start_datetime: string
  end_datetime: string
  reason: string
  notes?: string
}

export const doctorSchedulesApi = {
  list: async (params: {
    doctor_profile_id: string
    location_id?: string
  }): Promise<{ data: DoctorSchedule[] }> => {
    const response = await apiClient.get<{ data: DoctorSchedule[] }>('/doctor-schedules', { params })
    return response.data
  },

  get: async (id: string): Promise<DoctorSchedule> => {
    const response = await apiClient.get<DoctorSchedule>(`/doctor-schedules/${id}`)
    return response.data
  },

  create: async (payload: CreateBaseSchedulePayload): Promise<any> => {
    const response = await apiClient.post('/doctor-schedules', payload, {
      headers: {
        'Idempotency-Key': `create-schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    })
    return response.data
  },

  listOverrides: async (params: {
    doctor_profile_id: string
    start_date?: string
    end_date?: string
  }): Promise<{ data: ScheduleOverride[] }> => {
    const response = await apiClient.get<{ data: ScheduleOverride[] }>('/doctor-schedules/overrides', { params })
    return response.data
  },

  addOverride: async (payload: AddScheduleOverridePayload): Promise<any> => {
    const response = await apiClient.post('/doctor-schedules/overrides', payload, {
      headers: {
        'Idempotency-Key': `add-override-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    })
    return response.data
  },

  addForcedBlock: async (payload: AddForcedBlockPayload): Promise<any> => {
    const response = await apiClient.post('/doctor-schedules/forced-blocks', payload, {
      headers: {
        'Idempotency-Key': `add-block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    })
    return response.data
  },
}
