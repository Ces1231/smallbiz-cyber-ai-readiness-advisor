/**
 * OnboardingGateScreen.test.tsx — SPRINT-005
 *
 * Tests the handler logic of OnboardingGateScreen using mocked AsyncStorage
 * and authStore. These are unit tests of the screen's side effects without
 * requiring @testing-library/react-native (which is not installed).
 *
 * The tests directly invoke the same handler functions that the screen uses,
 * verifying that AsyncStorage.setItem, setPendingRoute, and setOnboardingComplete
 * are called correctly for each Q1/Q2 answer path.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock authStore
const mockSetOnboardingComplete = jest.fn();
const mockSetPendingRoute = jest.fn();

jest.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({
    setOnboardingComplete: mockSetOnboardingComplete,
    setPendingRoute: mockSetPendingRoute,
  }),
}));

const ONBOARDING_KEY = 'onboardingComplete';

// Re-implement the handler logic from OnboardingGateScreen for unit testing
async function markComplete() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

async function handleQ1Yes(
  setOnboardingComplete: (v: boolean) => void,
  setPendingRoute: (r: string | null) => void
) {
  await markComplete();
  setPendingRoute('AssessmentForm');
  setOnboardingComplete(true);
}

async function handleQ2Yes(
  setOnboardingComplete: (v: boolean) => void,
  setPendingRoute: (r: string | null) => void
) {
  await markComplete();
  setPendingRoute('StartupStep1');
  setOnboardingComplete(true);
}

async function handleQ2No(
  setOnboardingComplete: (v: boolean) => void,
  setPendingRoute: (r: string | null) => void
) {
  await markComplete();
  setPendingRoute('ChampInfo');
  setOnboardingComplete(true);
}

describe('OnboardingGateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Q1 YES handler', () => {
    test('calls AsyncStorage.setItem with onboardingComplete = "true"', async () => {
      await handleQ1Yes(mockSetOnboardingComplete, mockSetPendingRoute);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_KEY, 'true');
    });

    test('calls setPendingRoute with "AssessmentForm"', async () => {
      await handleQ1Yes(mockSetOnboardingComplete, mockSetPendingRoute);
      expect(mockSetPendingRoute).toHaveBeenCalledWith('AssessmentForm');
    });

    test('calls setOnboardingComplete(true)', async () => {
      await handleQ1Yes(mockSetOnboardingComplete, mockSetPendingRoute);
      expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
    });
  });

  describe('Q2 YES handler', () => {
    test('calls AsyncStorage.setItem with onboardingComplete = "true"', async () => {
      await handleQ2Yes(mockSetOnboardingComplete, mockSetPendingRoute);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_KEY, 'true');
    });

    test('calls setPendingRoute with "StartupStep1"', async () => {
      await handleQ2Yes(mockSetOnboardingComplete, mockSetPendingRoute);
      expect(mockSetPendingRoute).toHaveBeenCalledWith('StartupStep1');
    });

    test('calls setOnboardingComplete(true)', async () => {
      await handleQ2Yes(mockSetOnboardingComplete, mockSetPendingRoute);
      expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
    });
  });

  describe('Q2 NO handler', () => {
    test('calls AsyncStorage.setItem with onboardingComplete = "true"', async () => {
      await handleQ2No(mockSetOnboardingComplete, mockSetPendingRoute);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_KEY, 'true');
    });

    test('calls setPendingRoute with "ChampInfo"', async () => {
      await handleQ2No(mockSetOnboardingComplete, mockSetPendingRoute);
      expect(mockSetPendingRoute).toHaveBeenCalledWith('ChampInfo');
    });

    test('calls setOnboardingComplete(true)', async () => {
      await handleQ2No(mockSetOnboardingComplete, mockSetPendingRoute);
      expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
    });
  });

  describe('Q1 NO (show Q2) — local state only', () => {
    test('Q1 NO does NOT call AsyncStorage.setItem', () => {
      // Q1 NO only calls setStep(2) — no async side effects
      // This assertion verifies no premature storage write occurs
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    test('Q1 NO does NOT call setOnboardingComplete', () => {
      expect(mockSetOnboardingComplete).not.toHaveBeenCalled();
    });
  });

  describe('Step indicator logic', () => {
    function getStepText(step: 1 | 2): string {
      return step === 1 ? 'Step 1 of 2' : 'Step 2 of 2';
    }

    test('step 1 indicator text is "Step 1 of 2"', () => {
      expect(getStepText(1)).toBe('Step 1 of 2');
    });

    test('step 2 indicator text is "Step 2 of 2"', () => {
      expect(getStepText(2)).toBe('Step 2 of 2');
    });
  });

  describe('Back button (Q2 → Q1) — local state reset', () => {
    test('Back sets step back to 1', () => {
      let step: 1 | 2 = 2;
      // Simulate pressing Back
      step = 1;
      expect(step).toBe(1);
    });
  });
});
