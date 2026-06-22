import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StartupAssessmentRequest } from '../api/startup';

// ─── Assessment Draft ──────────────────────────────────────────────────────

interface AssessmentDraftState {
  business_name: string;
  industry: string;
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

const defaultAssessmentDraft: AssessmentDraftState = {
  business_name: '',
  industry: 'Retail',
  mfa: 0,
  backups: 0,
  training: 0,
  digital_tools: 0,
  automation: 0,
  ai_usage: 0,
  documents: 0,
  online_presence: 0,
  growth_plan: 0,
};

// ─── Startup Draft ─────────────────────────────────────────────────────────

type StartupDraftState = Partial<StartupAssessmentRequest>;

const defaultStartupDraft: StartupDraftState = {
  business_idea: '',
  target_customer: '',
  startup_budget: undefined,
  monthly_expenses: undefined,
  has_funding_source: false,
  formation_type: undefined,
  state_of_formation: '',
  has_business_license: false,
  has_industry_permit: false,
  industry_type: '',
  has_ein: false,
  has_business_plan: false,
  has_bank_account: false,
  has_domain: false,
  has_social_media: false,
  has_website: false,
  digital_tools_planned: 0,
  automation_planned: 0,
  ai_usage_planned: 0,
  password_manager_planned: false,
  backup_plan_exists: false,
  has_growth_goals: false,
  revenue_target_year1: undefined,
};

// ─── Store ─────────────────────────────────────────────────────────────────

interface DraftStore {
  assessmentDraft: AssessmentDraftState;
  startupDraft: StartupDraftState;

  setAssessmentDraftField: <K extends keyof AssessmentDraftState>(
    field: K,
    value: AssessmentDraftState[K]
  ) => void;
  clearAssessmentDraft: () => void;

  setStartupDraftField: <K extends keyof StartupDraftState>(
    field: K,
    value: StartupDraftState[K]
  ) => void;
  clearStartupDraft: () => void;
}

export const useDraftStore = create<DraftStore>()(
  persist(
    (set) => ({
      assessmentDraft: { ...defaultAssessmentDraft },
      startupDraft: { ...defaultStartupDraft },

      setAssessmentDraftField: (field, value) =>
        set((state) => ({
          assessmentDraft: { ...state.assessmentDraft, [field]: value },
        })),

      clearAssessmentDraft: () =>
        set({ assessmentDraft: { ...defaultAssessmentDraft } }),

      setStartupDraftField: (field, value) =>
        set((state) => ({
          startupDraft: { ...state.startupDraft, [field]: value },
        })),

      clearStartupDraft: () =>
        set({ startupDraft: { ...defaultStartupDraft } }),
    }),
    {
      name: 'champ-compass-draft',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
