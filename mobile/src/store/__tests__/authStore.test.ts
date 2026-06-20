/**
 * authStore.test.ts — SPRINT-005
 * Tests onboardingComplete + pendingRoute fields and regression guards
 * for removed pendingStartupRedirect field.
 */

// Mock expo-secure-store before importing the store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock auth API
jest.mock('../../api/auth', () => ({
  login: jest.fn(),
  signup: jest.fn(),
  getMe: jest.fn(),
}));

import { useAuthStore } from '../authStore';

beforeEach(() => {
  // Reset Zustand store to initial state between tests
  useAuthStore.setState({
    token: null,
    user: null,
    isLoggedIn: false,
    isPaid: false,
    isLoading: false,
    error: null,
    onboardingComplete: false,
    pendingRoute: null,
  });
});

describe('authStore — onboardingComplete + pendingRoute', () => {
  test('initial state: onboardingComplete is false', () => {
    const { onboardingComplete } = useAuthStore.getState();
    expect(onboardingComplete).toBe(false);
  });

  test('initial state: pendingRoute is null', () => {
    const { pendingRoute } = useAuthStore.getState();
    expect(pendingRoute).toBeNull();
  });

  test('setOnboardingComplete(true) updates state to true', () => {
    useAuthStore.getState().setOnboardingComplete(true);
    expect(useAuthStore.getState().onboardingComplete).toBe(true);
  });

  test('setOnboardingComplete(false) resets state to false', () => {
    useAuthStore.getState().setOnboardingComplete(true);
    useAuthStore.getState().setOnboardingComplete(false);
    expect(useAuthStore.getState().onboardingComplete).toBe(false);
  });

  test('setPendingRoute("AssessmentForm") updates state', () => {
    useAuthStore.getState().setPendingRoute('AssessmentForm');
    expect(useAuthStore.getState().pendingRoute).toBe('AssessmentForm');
  });

  test('setPendingRoute("StartupStep1") updates state', () => {
    useAuthStore.getState().setPendingRoute('StartupStep1');
    expect(useAuthStore.getState().pendingRoute).toBe('StartupStep1');
  });

  test('setPendingRoute("ChampInfo") updates state', () => {
    useAuthStore.getState().setPendingRoute('ChampInfo');
    expect(useAuthStore.getState().pendingRoute).toBe('ChampInfo');
  });

  test('setPendingRoute(null) clears the route', () => {
    useAuthStore.getState().setPendingRoute('AssessmentForm');
    useAuthStore.getState().setPendingRoute(null);
    expect(useAuthStore.getState().pendingRoute).toBeNull();
  });

  test('logout() resets onboardingComplete to false', async () => {
    useAuthStore.getState().setOnboardingComplete(true);
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().onboardingComplete).toBe(false);
  });

  test('logout() resets pendingRoute to null', async () => {
    useAuthStore.getState().setPendingRoute('StartupStep1');
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().pendingRoute).toBeNull();
  });

  // Regression guards — pendingStartupRedirect must be completely removed
  test('pendingStartupRedirect does NOT exist in state (regression guard)', () => {
    const state = useAuthStore.getState() as any;
    expect(state.pendingStartupRedirect).toBeUndefined();
  });

  test('setPendingStartupRedirect does NOT exist in state (regression guard)', () => {
    const state = useAuthStore.getState() as any;
    expect(state.setPendingStartupRedirect).toBeUndefined();
  });
});
