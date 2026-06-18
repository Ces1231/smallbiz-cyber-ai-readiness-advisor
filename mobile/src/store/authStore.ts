import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, signup as apiSignup, getMe, User } from '../api/auth';

const TOKEN_KEY = 'auth_token';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  isPaid: boolean;
  isLoading: boolean;
  error: string | null;
  /** Set to true when user authenticates via the "Starting a Business" path. */
  pendingStartupRedirect: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, businessName: string) => Promise<void>;
  logout: () => Promise<void>;
  setIsPaid: (paid: boolean) => void;
  clearError: () => void;
  setPendingStartupRedirect: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoggedIn: false,
  isPaid: false,
  isLoading: false,
  error: null,
  pendingStartupRedirect: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        const user = await getMe(token);
        set({ token, user, isLoggedIn: true });
      }
    } catch {
      // Token expired or invalid — clear it
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ token: null, user: null, isLoggedIn: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiLogin(email, password);
      await SecureStore.setItemAsync(TOKEN_KEY, res.access_token);
      set({ token: res.access_token, user: res.user, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message ?? 'Login failed', isLoading: false });
      throw err;
    }
  },

  signup: async (email, password, businessName) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiSignup(email, password, businessName);
      await SecureStore.setItemAsync(TOKEN_KEY, res.access_token);
      set({ token: res.access_token, user: res.user, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message ?? 'Signup failed', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null, isLoggedIn: false, isPaid: false });
  },

  setIsPaid: (paid) => set({ isPaid: paid }),

  clearError: () => set({ error: null }),

  setPendingStartupRedirect: (val) => set({ pendingStartupRedirect: val }),
}));
