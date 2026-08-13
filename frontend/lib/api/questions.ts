/**
 * Questions & Options API client.
 */
import { api } from "./client";
import type { Question, QuestionOption, QuestionType } from "../types";

export const questionsApi = {
  create: (formId: number, data: { type: QuestionType; title: string; description?: string; is_required?: boolean; settings_json?: Record<string, unknown> }) =>
    api.post<Question>(`/forms/${formId}/questions`, data),

  update: (id: number, data: { type?: QuestionType; title?: string; description?: string; is_required?: boolean; settings_json?: Record<string, unknown> }) =>
    api.patch<Question>(`/questions/${id}`, data),

  delete: (id: number) => api.delete<void>(`/questions/${id}`),

  reorder: (formId: number, order: { id: number; order_index: number }[]) =>
    api.post<{ detail: string }>(`/forms/${formId}/questions/reorder`, order),
};

export const optionsApi = {
  create: (questionId: number, label: string) =>
    api.post<QuestionOption>(`/questions/${questionId}/options`, { label }),

  update: (id: number, data: { label?: string; order_index?: number }) =>
    api.patch<QuestionOption>(`/options/${id}`, data),

  delete: (id: number) => api.delete<void>(`/options/${id}`),
};
