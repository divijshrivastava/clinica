import apiClient from "./client";

export interface MedicalNote {
  id: string;
  hospital_id: string;
  patient_id: string;
  visit_id?: string;
  note_type: 'handwritten' | 'typed' | 'template' | 'voice';
  title?: string;
  content?: string;
  image_urls?: string[];
  audio_url?: string;
  template_id?: string;
  is_signed: boolean;
  signed_at?: string;
  signed_by?: string;
  ocr_confidence?: number;
  ocr_status?: string;
  created_at: string;
  updated_at: string;
  current_version: number;
}

export interface MedicalNoteListResponse {
  data: MedicalNote[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface CreateMedicalNotePayload {
  patient_id: string;
  visit_id?: string;
  note_type: 'handwritten' | 'typed' | 'template' | 'voice';
  title?: string;
  content?: string;
  image_urls?: string[];
  audio_url?: string;
  template_id?: string;
}

export const medicalNotesApi = {
  list: async (params?: {
    limit?: number;
    offset?: number;
    patient_id?: string;
    visit_id?: string;
    note_type?: string;
  }): Promise<MedicalNoteListResponse> => {
    const response = await apiClient.get<MedicalNoteListResponse>(
      "/medical-notes",
      { params }
    );
    return response.data;
  },

  get: async (id: string): Promise<MedicalNote> => {
    const response = await apiClient.get<MedicalNote>(`/medical-notes/${id}`);
    return response.data;
  },

  create: async (payload: CreateMedicalNotePayload): Promise<any> => {
    const command_id = crypto.randomUUID();
    const idempotency_key = `create-medical-note-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const response = await apiClient.post("/commands/create-medical-note", {
      command_id,
      idempotency_key,
      payload,
    });
    return response.data;
  },
};

