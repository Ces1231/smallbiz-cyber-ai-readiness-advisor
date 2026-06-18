/**
 * Scoring utilities — exact parity with web app.js
 */

export function pct(vals: number[]): number {
  return Math.round((vals.reduce((a, b) => a + Number(b), 0) / (vals.length * 2)) * 100);
}

export function level(score: number): string {
  if (score >= 80) return 'Advanced readiness';
  if (score >= 60) return 'Growth-ready foundation';
  if (score >= 40) return 'Developing readiness';
  return 'High-priority improvement needed';
}

export function risk(score: number): 'Low' | 'Moderate' | 'High' {
  if (score >= 75) return 'Low';
  if (score >= 50) return 'Moderate';
  return 'High';
}

export interface AssessmentScoreResult {
  cyberScore: number;
  aiScore: number;
  fundingScore: number;
  overallScore: number;
  cyberLevel: string;
  aiLevel: string;
  fundingLevel: string;
  overallLevel: string;
  cyberRisk: 'Low' | 'Moderate' | 'High';
  aiRisk: 'Low' | 'Moderate' | 'High';
  fundingRisk: 'Low' | 'Moderate' | 'High';
}

export function computeAssessmentScores(inputs: {
  mfa: number;
  backups: number;
  training: number;
  digital_tools: number;
  automation: number;
  ai_usage: number;
  documents: number;
  online_presence: number;
  growth_plan: number;
}): AssessmentScoreResult {
  const cyberScore = pct([inputs.mfa, inputs.backups, inputs.training]);
  const aiScore = pct([inputs.digital_tools, inputs.automation, inputs.ai_usage]);
  const fundingScore = pct([inputs.documents, inputs.online_presence, inputs.growth_plan]);
  const overallScore = Math.round(cyberScore * 0.38 + aiScore * 0.32 + fundingScore * 0.30);

  return {
    cyberScore,
    aiScore,
    fundingScore,
    overallScore,
    cyberLevel: level(cyberScore),
    aiLevel: level(aiScore),
    fundingLevel: level(fundingScore),
    overallLevel: level(overallScore),
    cyberRisk: risk(cyberScore),
    aiRisk: risk(aiScore),
    fundingRisk: risk(fundingScore),
  };
}

export interface StartupScoreResult {
  formationScore: number;
  financialScore: number;
  digitalScore: number;
  complianceScore: number;
  overallScore: number;
}

export function computeStartupScores(data: {
  entity_type?: string;
  state_of_formation?: string;
  has_reg_agent?: boolean;
  budget_estimate?: number;
  funding_sources?: string;
  monthly_burn?: number;
  has_domain?: boolean;
  has_website?: boolean;
  has_social?: boolean;
  has_biz_email?: boolean;
  has_ein?: boolean;
  has_biz_plan?: boolean;
  has_op_agreement?: boolean;
  licenses_needed?: string;
}): StartupScoreResult {
  const formationScore =
    (data.entity_type ? 33 : 0) +
    (data.state_of_formation ? 34 : 0) +
    (data.has_reg_agent ? 33 : 0);

  const financialScore =
    ((data.budget_estimate ?? 0) > 0 ? 40 : 0) +
    (data.funding_sources ? 35 : 0) +
    ((data.monthly_burn ?? 0) > 0 ? 25 : 0);

  const digitalScore =
    (data.has_domain ? 25 : 0) +
    (data.has_website ? 25 : 0) +
    (data.has_social ? 25 : 0) +
    (data.has_biz_email ? 25 : 0);

  const complianceScore =
    (data.has_ein ? 30 : 0) +
    (data.has_biz_plan ? 25 : 0) +
    (data.has_op_agreement ? 25 : 0) +
    (data.licenses_needed ? 20 : 0);

  const overallScore = Math.round(
    formationScore * 0.3 +
      financialScore * 0.25 +
      digitalScore * 0.2 +
      complianceScore * 0.25
  );

  return { formationScore, financialScore, digitalScore, complianceScore, overallScore };
}
