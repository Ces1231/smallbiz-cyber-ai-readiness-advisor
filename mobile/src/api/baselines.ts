import { api } from './client';

export interface Baseline {
  id: string;
  user_id: string;
  assessment_id: string;
  created_at: string;
  assessment?: {
    business_name: string;
    overall_score: number;
    cyber_score: number;
    ai_score: number;
    funding_score: number;
    created_at: string;
  };
}

export async function saveBaseline(assessmentId: string, token: string): Promise<Baseline> {
  return api.post<Baseline>('/baselines', { assessment_id: assessmentId }, token);
}

export async function getBaseline(token: string): Promise<Baseline | null> {
  try {
    return await api.get<Baseline>('/baselines/me', token);
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export async function deleteBaseline(token: string): Promise<void> {
  return api.delete<void>('/baselines/me', token);
}
