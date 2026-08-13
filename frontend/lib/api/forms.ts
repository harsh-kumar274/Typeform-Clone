/**
 * Forms API client — typed methods for all form-related endpoints.
 */
import { api } from "./client";
import type { Form, FormListItem } from "../types";

export const formsApi = {
  list: () => api.get<FormListItem[]>("/forms"),

  get: (id: number) => api.get<Form>(`/forms/${id}`),

  create: (title: string, description?: string | null) =>
    api.post<Form>("/forms", { title, description }),

  update: (id: number, data: { title?: string; description?: string | null; theme_color?: string; thank_you_message?: string }) =>
    api.patch<Form>(`/forms/${id}`, data),

  delete: (id: number) => api.delete<void>(`/forms/${id}`),

  publish: (id: number) => api.post<Form>(`/forms/${id}/publish`),

  unpublish: (id: number) => api.post<Form>(`/forms/${id}/unpublish`),

  duplicate: (id: number) => api.post<Form>(`/forms/${id}/duplicate`),
};
