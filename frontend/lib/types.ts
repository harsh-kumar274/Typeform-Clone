/**
 * Shared TypeScript types mirroring the backend Pydantic schemas.
 * Every API response is typed through these — no `any` in the app.
 */

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export interface QuestionOption {
  id: number;
  question_id: number;
  label: string;
  order_index: number;
}

export interface Question {
  id: number;
  form_id: number;
  type: QuestionType;
  title: string;
  description: string | null;
  is_required: boolean;
  order_index: number;
  settings_json: Record<string, unknown> | null;
  options: QuestionOption[];
  created_at: string;
}

export interface Form {
  id: number;
  creator_id: number;
  title: string;
  description: string | null;
  status: "draft" | "published";
  public_slug: string | null;
  theme_color: string;
  thank_you_message: string;
  questions: Question[];
  created_at: string;
  updated_at: string;
}

export interface FormListItem {
  id: number;
  title: string;
  description: string | null;
  status: "draft" | "published";
  public_slug: string | null;
  response_count: number;
  created_at: string;
  updated_at: string;
}

export interface Answer {
  id: number;
  response_id: number;
  question_id: number;
  value_text: string | null;
  created_at: string;
}

export interface AnswerWithQuestion extends Answer {
  question_title: string | null;
  question_type: string | null;
}

export interface ResponseSummary {
  id: number;
  public_token: string;
  is_complete: boolean;
  started_at: string;
  submitted_at: string | null;
  answer_preview: string | null;
}

export interface ResponseDetail {
  id: number;
  form_id: number;
  public_token: string;
  is_complete: boolean;
  started_at: string;
  submitted_at: string | null;
  answers: AnswerWithQuestion[];
}

export interface PaginatedResponses {
  items: ResponseSummary[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface PublicResponseStart {
  response_token: string;
}

export interface PublicResponseResume {
  form_slug: string;
  answers: Answer[];
  is_complete: boolean;
}

// Stats types
export interface OptionStat {
  label: string;
  count: number;
  percentage: number;
}

export interface DistributionBucket {
  value?: number;
  range?: string;
  count: number;
}

export interface QuestionStat {
  question_id: number;
  title: string;
  type: QuestionType;
  response_count: number;
  options?: OptionStat[];
  average?: number | null;
  min?: number | null;
  max?: number | null;
  distribution?: DistributionBucket[];
  sample_answers?: string[];
}

export interface FormStats {
  form_id: number;
  total_responses: number;
  total_sessions: number;
  completion_rate: number;
  questions: QuestionStat[];
}
