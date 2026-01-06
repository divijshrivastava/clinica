import apiClient from "./client";

export interface Prescription {
  id: string;
  hospital_id: string;
  patient_id: string;
  visit_id?: string;
  doctor_id: string;
  prescription_number: string;
  medications: Medication[];
  diagnosis: string;
  notes?: string;
  is_digital_signature: boolean;
  signature_url?: string;
  valid_until?: string;
  is_dispensed: boolean;
  dispensed_at?: string;
  dispensed_by?: string;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration_days?: number;
  instructions?: string;
  quantity?: number;
}

export interface PrescriptionListResponse {
  data: Prescription[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface CreatePrescriptionPayload {
  patient_id: string;
  visit_id?: string;
  medications: Medication[];
  diagnosis?: string;
  notes?: string;
  valid_until?: string;
}

export const prescriptionsApi = {
  list: async (params?: {
    limit?: number;
    offset?: number;
    patient_id?: string;
    visit_id?: string;
    is_dispensed?: boolean;
  }): Promise<PrescriptionListResponse> => {
    const response = await apiClient.get<PrescriptionListResponse>(
      "/prescriptions",
      { params }
    );
    return response.data;
  },

  get: async (id: string): Promise<Prescription> => {
    const response = await apiClient.get<Prescription>(`/prescriptions/${id}`);
    return response.data;
  },

  create: async (payload: CreatePrescriptionPayload): Promise<any> => {
    const command_id = crypto.randomUUID();
    const idempotency_key = `create-prescription-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const response = await apiClient.post("/commands/create-prescription", {
      command_id,
      idempotency_key,
      payload,
    });
    return response.data;
  },
};
