import apiClient from './client'

export interface AppointmentSlot {
  id: string
  hospital_id: string
  doctor_profile_id: string
  doctor_name?: string
  specialties?: string[]
  consultation_fee?: number
  profile_image_url?: string
  location_id: string
  location_name?: string
  location_address?: string
  schedule_source: 'base_schedule' | 'override'
  slot_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  consultation_mode: 'in_person' | 'tele_consultation'
  max_capacity: number
  max_in_person_capacity: number
  max_tele_capacity: number
  current_bookings: number
  in_person_bookings: number
  tele_bookings: number
  status: 'available' | 'blocked' | 'fully_booked'
  blocked_reason?: string
  blocked_by?: string
  blocked_at?: string
  created_at: string
  updated_at: string
}

export interface TentativeHold {
  id: string
  slot_id: string
  patient_id?: string
  hold_type: 'patient_booking' | 'admin_booking' | 'system_reservation'
  held_by: string
  expires_at: string
  status: 'active' | 'released' | 'expired'
  notes?: string
  created_at: string
}

export const appointmentSlotsApi = {
  searchAvailability: async (params: {
    doctor_profile_id?: string
    location_id?: string
    specialty?: string
    start_date?: string
    end_date?: string
    consultation_mode?: string
  }): Promise<{ data: AppointmentSlot[] }> => {
    const response = await apiClient.get<{ data: AppointmentSlot[] }>('/appointment-slots/availability', { params })
    return response.data
  },

  get: async (id: string): Promise<AppointmentSlot> => {
    const response = await apiClient.get<AppointmentSlot>(`/appointment-slots/${id}`)
    return response.data
  },

  createHold: async (slotId: string, payload: {
    patient_id?: string
    hold_type: 'patient_booking' | 'admin_booking' | 'system_reservation'
    hold_duration_minutes?: number
    notes?: string
  }): Promise<any> => {
    const response = await apiClient.post(`/appointment-slots/${slotId}/hold`, payload, {
      headers: {
        'Idempotency-Key': `create-hold-${slotId}-${Date.now()}`,
      },
    })
    return response.data
  },

  releaseHold: async (slotId: string, notes?: string): Promise<any> => {
    const response = await apiClient.delete(`/appointment-slots/${slotId}/hold`, {
      data: { notes },
      headers: {
        'Idempotency-Key': `release-hold-${slotId}-${Date.now()}`,
      },
    })
    return response.data
  },

  blockSlot: async (slotId: string, reason: string, notes?: string): Promise<any> => {
    const response = await apiClient.post(`/appointment-slots/${slotId}/block`, {
      reason,
      notes,
    }, {
      headers: {
        'Idempotency-Key': `block-slot-${slotId}-${Date.now()}`,
      },
    })
    return response.data
  },
}
