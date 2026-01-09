import apiClient from './client'

export interface Visit {
  id: string
  hospital_id: string
  patient_id: string
  doctor_id: string
  patient?: {
    mrn?: string
    first_name?: string
    last_name?: string
  }
  doctor?: {
    name?: string
    email?: string
    specialization?: string
  }
  visit_number?: number
  visit_date: string
  visit_time?: string
  visit_type: string
  chief_complaint: string
  status: string
  examination_findings?: string
  diagnosis?: string
  treatment_plan?: string
  follow_up_date?: string
  follow_up_instructions?: string
  duration_minutes?: number
  vitals?: any
  notes?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
  current_version: number
}

export interface VisitListResponse {
  data: Visit[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export interface ScheduleVisitPayload {
  patient_id: string
  visit_type: 'consultation' | 'follow_up' | 'procedure' | 'emergency'
  chief_complaint: string
  scheduled_at?: string
  priority?: 'routine' | 'urgent' | 'emergency'
  notes?: string
}

export interface CompleteVisitPayload {
  diagnosis?: string
  treatment_notes?: string
  follow_up_required?: boolean
  follow_up_date?: string
  discharge_instructions?: string
}

export const visitsApi = {
  list: async (params?: {
    limit?: number
    offset?: number
    status?: string
  }): Promise<VisitListResponse> => {
    const response = await apiClient.get<VisitListResponse>('/visits', { params })
    return response.data
  },

  get: async (id: string): Promise<Visit> => {
    const response = await apiClient.get<Visit>(`/visits/${id}`)
    return response.data
  },

  schedule: async (payload: ScheduleVisitPayload): Promise<any> => {
    const command_id = crypto.randomUUID()
    const idempotency_key = `schedule-visit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const response = await apiClient.post('/commands/schedule-visit', {
      command_id,
      idempotency_key,
      payload,
    })
    return response.data
  },

  complete: async (id: string, payload: CompleteVisitPayload): Promise<any> => {
    const command_id = crypto.randomUUID()
    const idempotency_key = `complete-visit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const response = await apiClient.post('/commands/complete-visit', {
      command_id,
      idempotency_key,
      aggregate_id: id,
      payload,
    })
    return response.data
  },
}
