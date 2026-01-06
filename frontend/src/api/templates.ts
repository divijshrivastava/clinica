import apiClient from "./client";

export interface NoteTemplate {
  id: string;
  hospital_id: string;
  name: string;
  category?: string;
  description?: string;
  template_content: any; // JSONB content
  is_global: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateListResponse {
  data: NoteTemplate[];
}

export const templatesApi = {
  list: async (params?: {
    category?: string;
    is_active?: boolean;
  }): Promise<TemplateListResponse> => {
    const response = await apiClient.get<TemplateListResponse>(
      "/templates",
      { params }
    );
    return response.data;
  },
};

