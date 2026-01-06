import apiClient from "./client";

export interface Appointment {
  id: string;
  hospital_id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  appointment_type?: string;
  status: string;
  reason?: string;
  notes?: string;
  reminder_sent_at?: string;
  confirmed_at?: string;
  confirmed_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  no_show_recorded_at?: string;
  visit_id?: string;
  current_version: number;
  created_at: string;
  updated_at: string;
  patient?: {
    mrn?: string;
    first_name?: string;
    last_name?: string;
  };
  // Legacy fields for backward compatibility
  patient_mrn?: string;
  patient_first_name?: string;
  patient_last_name?: string;
}

export interface AppointmentListResponse {
  data: Appointment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface ScheduleAppointmentPayload {
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  appointment_type?: string;
  reason?: string;
  notes?: string;
}

export interface CancelAppointmentPayload {
  cancellation_reason: string;
}

export const appointmentsApi = {
  list: async (params?: {
    limit?: number;
    offset?: number;
    patient_id?: string;
    status?: string;
  }): Promise<AppointmentListResponse> => {
    const response = await apiClient.get<AppointmentListResponse>(
      "/appointments",
      { params }
    );
    return response.data;
  },

  get: async (id: string): Promise<Appointment> => {
    const response = await apiClient.get<Appointment>(`/appointments/${id}`);
    return response.data;
  },

  schedule: async (payload: ScheduleAppointmentPayload): Promise<any> => {
    const command_id = crypto.randomUUID();
    const idempotency_key = `schedule-appointment-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const response = await apiClient.post("/commands/schedule-appointment", {
      command_id,
      idempotency_key,
      payload,
    });
    return response.data;
  },

  cancel: async (id: string, payload: CancelAppointmentPayload): Promise<any> => {
    const command_id = crypto.randomUUID();
    const idempotency_key = `cancel-appointment-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const response = await apiClient.post("/commands/cancel-appointment", {
      command_id,
      idempotency_key,
      aggregate_id: id,
      payload,
    });
    return response.data;
  },
};

