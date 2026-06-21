import { api } from './client';

export interface IdeaSuggestion {
  name: string;
  description: string;
  business_fit_pct: number;
  startup_cost_tier: 'Low' | 'Medium' | 'High';
  difficulty_tier: 'Easy' | 'Medium' | 'Hard';
  revenue_potential: string;
}

export interface QuizSubmitResponse {
  business_idea_id: string;
  suggestions: IdeaSuggestion[];
  mission_preview: string;
}

export interface SavedIdeaData {
  business_idea_id: string;
  idea_name: string;
  idea_description: string;
  business_fit_pct: number;
  startup_cost_tier: string;
  difficulty_tier: string;
  revenue_potential: string;
  mission_preview: string;
}

export interface LaunchPlan {
  business_idea_id: string;
  tier: string;
  checklist: Array<{ item: string; category: string; required: boolean }> | null;
  cost_calculator: Array<{ item: string; estimated_cost_low: number; estimated_cost_high: number; category: string }> | null;
  pricing_packages: Array<{ name: string; description: string; price_suggestion: string; included_services: string[] }> | null;
  thirty_day_plan: Array<{ week: number; title: string; milestones: string[] }> | null;
  business_plan_text: string | null;
  mission_vision: string | null;
  customer_persona: Record<string, string> | null;
  funding_checklist: Array<{ item: string; category: string; completed: boolean }> | null;
  cyber_ai_checklist: Array<{ item: string; category: string; completed: boolean }> | null;
  ninety_day_roadmap: Array<{ month: number; title: string; goals: string[] }> | null;
  pdf_url: string | null;
  created_at: string;
}

export interface PurchaseStatusResponse {
  launch_builder: boolean;
  launch_packet_pro: boolean;
  advisor_review: boolean;
}

export interface OneTimeCheckoutResponse {
  client_secret: string;
  payment_intent_id: string;
  amount_cents: number;
  product_key: string;
}

export async function submitQuiz(
  token: string,
  payload: {
    skills: string[];
    problems: string[];
    business_type: string;
    starting_capital: string;
    weekly_hours: string;
  }
): Promise<QuizSubmitResponse> {
  return api.post<QuizSubmitResponse>('/business/quiz', payload, token);
}

export async function saveIdea(
  token: string,
  ideaId: string,
  ideaIndex: number
): Promise<SavedIdeaData> {
  return api.post<SavedIdeaData>(`/business/ideas/${ideaId}/save`, { idea_index: ideaIndex }, token);
}

export async function getLaunchPlan(
  token: string,
  ideaId: string,
  tier: string
): Promise<LaunchPlan> {
  return api.get<LaunchPlan>(`/business/ideas/${ideaId}/plan?tier=${tier}`, token);
}

export async function generatePdf(
  token: string,
  ideaId: string
): Promise<{ pdf_url: string; generated_at: string }> {
  return api.post<{ pdf_url: string; generated_at: string }>(
    `/business/ideas/${ideaId}/generate-pdf`,
    {},
    token
  );
}

export async function getPurchaseStatus(token: string): Promise<PurchaseStatusResponse> {
  return api.get<PurchaseStatusResponse>('/billing/purchases', token);
}

export async function createOneTimeCheckout(
  token: string,
  productKey: string
): Promise<OneTimeCheckoutResponse> {
  return api.post<OneTimeCheckoutResponse>(
    '/billing/one-time-checkout',
    { product_key: productKey },
    token
  );
}

export async function submitAdvisorRequest(
  token: string,
  businessIdeaId: string | null
): Promise<{ advisor_request_id: string; status: string; message: string }> {
  return api.post<{ advisor_request_id: string; status: string; message: string }>(
    '/business/advisor-request',
    { business_idea_id: businessIdeaId },
    token
  );
}
