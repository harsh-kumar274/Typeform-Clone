/**
 * Responses API client — both public (respondent) and creator-facing endpoints.
 */
import { api } from "./client";
import type {
  Form, Answer, PublicResponseStart, PublicResponseResume,
  PaginatedResponses, ResponseDetail, FormStats
} from "../types";

// Public respondent endpoints (use public_token, not integer ID)
export const respondApi = {
  getPublicForm: (slug: string) =>
    api.get<Form>(`/public/forms/${slug}`),

  startResponse: (slug: string) =>
    api.post<PublicResponseStart>(`/public/forms/${slug}/responses`),

  resumeResponse: (token: string) =>
    api.get<PublicResponseResume>(`/public/responses/${token}`),

  saveAnswer: (token: string, questionId: number, valueText: string | null) =>
    api.patch<Answer>(`/public/responses/${token}/answers`, {
      question_id: questionId,
      value_text: valueText,
    }),

  submit: (token: string) =>
    api.post<{ detail: string }>(`/public/responses/${token}/submit`),
};

// Creator-facing results endpoints
export const resultsApi = {
  listResponses: (formId: number, page = 1, perPage = 20) =>
    api.get<PaginatedResponses>(`/forms/${formId}/responses?page=${page}&per_page=${perPage}`),

  getResponse: (responseId: number) =>
    api.get<ResponseDetail>(`/responses/${responseId}`),

  getStats: (formId: number) =>
    api.get<FormStats>(`/forms/${formId}/stats`),

  exportCsv: (formId: number) =>
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/forms/${formId}/responses/export`,
};
