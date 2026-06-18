import { api } from './client';

export interface StartupAssessmentRequest {
  // Step 1
  business_idea?: string;
  target_customer?: string;
  // Step 2
  startup_budget?: number;
  monthly_expenses?: number;
  has_funding_source: boolean;
  // Step 3
  formation_type?: string;
  state_of_formation?: string;
  // Step 4
  has_business_license: boolean;
  has_industry_permit: boolean;
  industry_type?: string;
  // Step 5
  has_ein: boolean;
  has_business_plan: boolean;
  has_bank_account: boolean;
  // Step 6
  has_domain: boolean;
  has_social_media: boolean;
  has_website: boolean;
  // Step 7
  digital_tools_planned: number;
  automation_planned: number;
  ai_usage_planned: number;
  // Step 8
  password_manager_planned: boolean;
  backup_plan_exists: boolean;
  // Step 9
  has_growth_goals: boolean;
  revenue_target_year1?: number;
}

export interface StartupAssessmentResponse extends StartupAssessmentRequest {
  id: string;
  user_id: string;
  formation_score: number;
  finance_score: number;
  digital_score: number;
  launch_readiness: number;
  created_at: string;
  updated_at: string;
}

export interface StartupAssessmentListItem {
  id: string;
  business_idea?: string;
  launch_readiness: number;
  formation_score: number;
  finance_score: number;
  digital_score: number;
  created_at: string;
}

export interface StartupAssessmentListResponse {
  data: StartupAssessmentListItem[];
}

export async function createStartupAssessment(
  data: StartupAssessmentRequest,
  token: string
): Promise<StartupAssessmentResponse> {
  return api.post<StartupAssessmentResponse>('/startup/assessments', data, token);
}

export async function listStartupAssessments(
  token: string
): Promise<StartupAssessmentListResponse> {
  return api.get<StartupAssessmentListResponse>('/startup/assessments', token);
}

export async function getStartupAssessment(
  id: string,
  token: string
): Promise<StartupAssessmentResponse> {
  return api.get<StartupAssessmentResponse>(`/startup/assessments/${id}`, token);
}
