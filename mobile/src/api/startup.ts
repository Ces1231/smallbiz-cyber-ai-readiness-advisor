import { api } from './client';

export interface StartupAssessmentDraft {
  // Section 1: Purpose
  purpose?: string;
  industry?: string;
  target_customer?: string;
  // Section 2: Budget
  budget_estimate?: number;
  funding_sources?: string;
  monthly_burn?: number;
  // Section 3: Formation
  entity_type?: string;
  state_of_formation?: string;
  // Section 4: Documentation
  has_ein?: boolean;
  has_biz_plan?: boolean;
  has_op_agreement?: boolean;
  has_reg_agent?: boolean;
  // Section 5: Licenses
  licenses_needed?: string;
  local_permits?: string;
  // Section 6: Digital
  has_domain?: boolean;
  has_website?: boolean;
  has_social?: boolean;
  has_biz_email?: boolean;
  // Section 7: Cyber
  cyber_mfa?: number;
  cyber_backups?: number;
  cyber_policy?: number;
  // Section 8: AI
  ai_interest?: number;
  automation_ready?: number;
  // Section 9: Growth
  has_30_60_90?: boolean;
  first_customer_plan?: string;
  revenue_goal?: number;
  // Draft tracking
  draft_step?: number;
}

export interface StartupScores {
  formation_score: number;
  financial_score: number;
  digital_score: number;
  compliance_score: number;
  overall_score: number;
}

export interface StartupAssessment extends StartupAssessmentDraft, StartupScores {
  id: string;
  user_id: string;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface StartupAssessmentSummary {
  id: string;
  overall_score: number;
  industry?: string;
  created_at: string;
  is_complete: boolean;
}

export async function createStartupDraft(token: string): Promise<StartupAssessment> {
  return api.post<StartupAssessment>('/startup-assessments', {}, token);
}

export async function updateStartupDraft(
  id: string,
  data: StartupAssessmentDraft,
  token: string
): Promise<StartupAssessment> {
  return api.patch<StartupAssessment>(`/startup-assessments/${id}`, data, token);
}

export async function completeStartupAssessment(
  id: string,
  token: string
): Promise<StartupAssessment> {
  return api.post<StartupAssessment>(`/startup-assessments/${id}/complete`, {}, token);
}

export async function listStartupAssessments(token: string): Promise<StartupAssessmentSummary[]> {
  return api.get<StartupAssessmentSummary[]>('/startup-assessments', token);
}

export async function getStartupAssessment(id: string, token: string): Promise<StartupAssessment> {
  return api.get<StartupAssessment>(`/startup-assessments/${id}`, token);
}
