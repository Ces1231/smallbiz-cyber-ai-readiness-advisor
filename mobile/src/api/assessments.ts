import { api } from './client';

export interface AssessmentInput {
  business_name: string;
  industry: string;
  primary_challenge?: string;
  mfa: number;
  backups: number;
  training: number;
  digital_tools: number;
  automation: number;
  ai_usage: number;
  documents: number;
  online_presence: number;
  growth_plan: number;
}

export interface AssessmentScores {
  cyber_score: number;
  ai_score: number;
  funding_score: number;
  overall_score: number;
  cyber_level: string;
  ai_level: string;
  funding_level: string;
  overall_level: string;
  cyber_risk: string;
  ai_risk: string;
  funding_risk: string;
}

export interface Assessment extends AssessmentInput, AssessmentScores {
  id: string;
  user_id: string;
  created_at: string;
}

export interface AssessmentSummary {
  id: string;
  business_name: string;
  overall_score: number;
  overall_level: string;
  created_at: string;
}

export async function createAssessment(
  data: AssessmentInput,
  token: string
): Promise<Assessment> {
  return api.post<Assessment>('/assessments', data, token);
}

export async function listAssessments(token: string): Promise<AssessmentSummary[]> {
  return api.get<AssessmentSummary[]>('/assessments', token);
}

export async function getAssessment(id: string, token: string): Promise<Assessment> {
  return api.get<Assessment>(`/assessments/${id}`, token);
}
