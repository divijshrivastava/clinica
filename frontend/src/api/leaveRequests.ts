import apiClient from './client'

export interface LeaveRequest {
  id: string
  hospital_id: string
  doctor_profile_id: string
  doctor_name?: string
  leave_type: 'sick' | 'vacation' | 'emergency' | 'conference' | 'other'
  start_date: string
  end_date: string
  reason: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  requested_by: string
  approved_by?: string
  approved_at?: string
  approver_notes?: string
  rejected_by?: string
  rejected_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface LeaveRequestListResponse {
  data: LeaveRequest[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export interface RequestLeavePayload {
  doctor_profile_id: string
  leave_type: 'sick' | 'vacation' | 'emergency' | 'conference' | 'other'
  start_date: string
  end_date: string
  reason: string
  notes?: string
}

export const leaveRequestsApi = {
  list: async (params?: {
    limit?: number
    offset?: number
    doctor_profile_id?: string
    status?: string
  }): Promise<LeaveRequestListResponse> => {
    const response = await apiClient.get<LeaveRequestListResponse>('/leave-requests', { params })
    return response.data
  },

  get: async (id: string): Promise<LeaveRequest> => {
    const response = await apiClient.get<LeaveRequest>(`/leave-requests/${id}`)
    return response.data
  },

  request: async (payload: RequestLeavePayload): Promise<any> => {
    const response = await apiClient.post('/leave-requests', payload, {
      headers: {
        'Idempotency-Key': `request-leave-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    })
    return response.data
  },

  approve: async (id: string, approver_notes?: string): Promise<any> => {
    const response = await apiClient.post(`/leave-requests/${id}/approve`, {
      approver_notes,
    }, {
      headers: {
        'Idempotency-Key': `approve-leave-${id}-${Date.now()}`,
      },
    })
    return response.data
  },

  reject: async (id: string, rejection_reason: string, rejector_notes?: string): Promise<any> => {
    const response = await apiClient.post(`/leave-requests/${id}/reject`, {
      rejection_reason,
      rejector_notes,
    }, {
      headers: {
        'Idempotency-Key': `reject-leave-${id}-${Date.now()}`,
      },
    })
    return response.data
  },
}
