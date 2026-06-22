# SPRINT-005: Onboarding Gate — Sequential Q1/Q2 Post-Login Flow (Web + Mobile)

**Sprint ID:** SPRINT-005
**Sprint Type:** Feature build — cross-platform post-login onboarding gate
**Builder:** Wasp
**Branch:** `feature/sprint-005-onboarding-gate`
**Status:** Draft
**Spec Author:** J.A.R.V.I.S.
**Created:** 2026-06-19
**Project Stage:** pre-production

> **Note:** This spec replaces the previously drafted SPRINT-005-existing-business.md, which has been archived as ARCHIVE-SPRINT-005-existing-business.md. The existing-business path content from that draft (AssessmentFormScreen refactor, roadmap screen, draft store wiring) is explicitly deferred to SPRINT-006.

---

## Sprint Meta

| Field | Value |
|-------|-------|
| Sprint ID | SPRINT-005 |
| Sprint Type | Feature build — cross-platform post-login onboarding gate |
| Total Estimated Hours | ~30 hrs |
| Features | 5 |
| Branch | `feature/sprint-005-onboarding-gate` |
| Builder | Wasp |
| Spec Author | J.A.R.V.I.S. |
| Created | 2026-06-19 |
| Dependencies | SPRINT-003 (auth + billing), SPRINT-004 (mobile shell complete) |

---

## Sprint Overview

After a user creates an account (or logs in for the first time on a new device/browser), the app currently drops them directly onto the assessment screen (web) or the Home tab (mobile). There is no routing logic — the user is responsible for knowing which path they want.

This sprint adds a **sequential Yes/No onboarding gate** that fires exactly once per device/browser after first login. It replaces the existing pre-login StageGate screen on mobile and introduces a new post-login modal on web.

### The Gate Flow (both platforms)

```
Q1: "Are you seeking advice on your current or existing business?"
  YES  → route to Existing Business Assessment
  NO   → show Q2

Q2: "Are you looking for advice on starting a new business?"
  YES  → route to Startup Assessment
  NO   → show Champtron Systems info screen/panel
```

The gate fires only once. After the user answers Q1 or Q2, `onboardingComplete` is persisted to AsyncStorage (mobile) or localStorage (web). Subsequent logins on the same device skip the gate entirely.

### Why These Features Are Batched Together

All five features touch the same logical problem — "where does the user go after login?" — and share the Champtron Systems content block. Mobile navigation refactor must land before OnboardingGateScreen can be wired in. Web modal is independent but uses the same copy. Tests complete the batch.

---

## Feature Sequence

Wasp executes features in this exact order. Do not reorder.

| # | Feature | Est Hours | Files Touched | Migration? |
|---|---------|-----------|--------------|------------|
| 1 | Mobile: OnboardingGateScreen | 8 hrs | NEW: `mobile/src/screens/onboarding/OnboardingGateScreen.tsx` | No |
| 2 | Mobile: ChampInfoScreen | 5 hrs | NEW: `mobile/src/screens/ChampInfoScreen.tsx` | No |
| 3 | Mobile: Navigation & Auth Refactor | 9 hrs | 8 existing files modified | No |
| 4 | Web: Post-Login Onboarding Modal | 5 hrs | `app.js`, `index.html`, `styles.css` | No |
| 5 | Tests | 3 hrs | `mobile/src/screens/onboarding/__tests__/`, `mobile/src/screens/__tests__/` | No |

---

## Feature Specs

---

### Feature 1: Mobile — OnboardingGateScreen

**Read-ahead hints for Wasp:**
Before writing Feature 1, pre-load in parallel:
- `mobile/src/theme/colors.ts` — color palette
- `mobile/src/theme/typography.ts` — font size/weight tokens
- `mobile/src/components/Button.tsx` — component API
- `mobile/src/store/authStore.ts` — current store shape (will be changed in Feature 3; read now for context only)
- `mobile/src/screens/StageGateScreen.tsx` — visual style reference to match

**Estimated Hours:** ~8 hrs

#### Overview

Create a new screen at `mobile/src/screens/onboarding/OnboardingGateScreen.tsx` that presents the two-question Yes/No onboarding flow post-login. This screen replaces the functionality of `StageGateScreen` but lives in the authenticated app stack (not auth stack) and drives routing by persisting `onboardingComplete` to AsyncStorage.

The screen renders one question at a time. Q1 is shown first. If the user answers YES, onboarding is marked complete and they are routed to the existing business assessment. If they answer NO, Q2 is shown. If they answer YES to Q2, they are routed to StartupStep1. If they answer NO to Q2, they are routed to ChampInfo.

#### File to Create

`mobile/src/screens/onboarding/OnboardingGateScreen.tsx`

#### Screen Props

This screen is registered in `AppStackParamList` as `OnboardingGate: undefined`. It receives navigation from React Navigation native stack.

```typescript
type Props = NativeStackScreenProps<AppStackParamList, 'OnboardingGate'>;
```

#### State

```typescript
// Local component state only — no Zustand state needed
const [step, setStep] = useState<1 | 2>(1);
```

#### AsyncStorage Key

```
'onboardingComplete'   // value: 'true' (string)
```

Use `import AsyncStorage from '@react-native-async-storage/async-storage';`

Do NOT use `expo-secure-store` — this data is not sensitive.

#### Complete Implementation

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'OnboardingGate'>;

const ONBOARDING_KEY = 'onboardingComplete';

async function markComplete() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export function OnboardingGateScreen({ navigation }: Props) {
  const [step, setStep] = useState<1 | 2>(1);

  async function handleQ1Yes() {
    // Existing business path
    await markComplete();
    navigation.replace('AssessmentForm');
  }

  async function handleQ1No() {
    // Advance to Q2
    setStep(2);
  }

  async function handleQ2Yes() {
    // Startup path
    await markComplete();
    navigation.replace('StartupStep1');
  }

  async function handleQ2No() {
    // Champtron Systems info — not a match for either service
    await markComplete();
    navigation.replace('ChampInfo');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.brand}>Champtron Systems LLC</Text>
          <Text style={styles.title}>Champ Compass</Text>
          <Text style={styles.stepIndicator}>{step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}</Text>
        </View>

        {step === 1 ? (
          <View style={styles.questionCard}>
            <Text style={styles.question}>
              Are you seeking advice on your current or existing business?
            </Text>
            <Text style={styles.hint}>
              This helps us route you to the right assessment.
            </Text>
            <View style={styles.buttonGroup}>
              <Button title="Yes" onPress={handleQ1Yes} style={styles.btn} />
              <Button title="No" variant="secondary" onPress={handleQ1No} style={styles.btn} />
            </View>
          </View>
        ) : (
          <View style={styles.questionCard}>
            <Button
              title="← Back"
              variant="ghost"
              onPress={() => setStep(1)}
              style={styles.backBtn}
            />
            <Text style={styles.question}>
              Are you looking for advice on starting a new business?
            </Text>
            <Text style={styles.hint}>
              We offer a guided launch readiness assessment for new entrepreneurs.
            </Text>
            <View style={styles.buttonGroup}>
              <Button title="Yes" onPress={handleQ2Yes} style={styles.btn} />
              <Button title="No" variant="secondary" onPress={handleQ2No} style={styles.btn} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 48, flexGrow: 1, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: 40 },
  brand: {
    color: colors.muted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
    marginBottom: 10,
  },
  stepIndicator: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
  },

  questionCard: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 16,
  },
  question: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    lineHeight: 30,
  },
  hint: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  buttonGroup: { gap: 12, marginTop: 8 },
  btn: { width: '100%' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 4 },
});
```

#### Behavior Rules

- `navigation.replace()` is used (not `navigate`) so the user cannot press Back and return to the gate after answering.
- The gate fires only once per device. Persistence is handled here (in `markComplete()`), not in the navigator.
- Q1 answer of YES routes to `AssessmentForm` (existing business assessment entry point).
- Q1 answer of NO shows Q2 in the same screen via local `step` state — no new screen push.
- Q2 answer of YES routes to `StartupStep1`.
- Q2 answer of NO routes to `ChampInfo`.
- `Back` button on Q2 sets `step` back to 1 — does not navigate back.

#### Acceptance Criteria

- [ ] Q1 is displayed on mount; Q2 is hidden
- [ ] Pressing YES on Q1 calls `AsyncStorage.setItem('onboardingComplete', 'true')` and navigates via `replace` to `AssessmentForm`
- [ ] Pressing NO on Q1 shows Q2 in the same screen (no screen push); Back button visible on Q2
- [ ] Pressing YES on Q2 sets `onboardingComplete` and navigates via `replace` to `StartupStep1`
- [ ] Pressing NO on Q2 sets `onboardingComplete` and navigates via `replace` to `ChampInfo`
- [ ] Pressing Back on Q2 returns the screen to Q1 state (local state reset, no navigation event)
- [ ] Step indicator reads "Step 1 of 2" / "Step 2 of 2" correctly
- [ ] Screen uses dark theme colors (`colors.background`, `colors.panel`, `colors.text`)
- [ ] On subsequent app open with `onboardingComplete = 'true'` in AsyncStorage, this screen is never shown

---

### Feature 2: Mobile — ChampInfoScreen

**Read-ahead hints for Wasp:**
Before writing Feature 2, pre-load in parallel:
- `mobile/src/theme/colors.ts`
- `mobile/src/theme/typography.ts`
- `mobile/src/components/Button.tsx`
- `mobile/src/components/Card.tsx`

**Estimated Hours:** ~5 hrs

#### Overview

Create a new screen at `mobile/src/screens/ChampInfoScreen.tsx` that presents Champtron Systems LLC company information for users who answer No/No on the onboarding gate. The screen is informational with tap-to-call, tap-to-email, and a CTA button that opens the website in the device browser. It is also reachable from the navigation stack directly (registered as `ChampInfo` in `AppStackParamList`).

#### File to Create

`mobile/src/screens/ChampInfoScreen.tsx`

#### Content Data (hard-coded — do not fetch)

```typescript
const COMPANY = {
  name: 'Champtron Systems LLC',
  tagline: 'Advanced IT Solutions for Modern Businesses',
  location: 'Sanford, FL',
  about: 'Local IT solutions provider specializing in automation, networking, infrastructure as code, and AI technologies to help businesses optimize operations. Security-first mindset.',
  phone: '(810) 407-0773',
  email: 'info@champtron-systems.com',
  hours: 'Mon–Fri 8AM–6PM  |  Sat 9AM–2PM',
  website: 'https://www.champtron-systems.com',
  contactUrl: 'https://www.champtron-systems.com/#contact',
  services: [
    'IT Automation',
    'Network Solutions',
    'Infrastructure as Code',
    'Zero Trust Security',
    'AI Solutions',
    'Data Management',
    'Cybersecurity',
    'Custom Application Development',
    'Website Development',
  ],
  valueProps: [
    { icon: '⚡', label: 'Same-Day Response' },
    { icon: '📍', label: 'Truly Local (Central Florida)' },
    { icon: '🔒', label: 'Security-First' },
    { icon: '💰', label: 'Transparent Pricing' },
    { icon: '✅', label: '99.9% Uptime' },
  ],
};
```

#### Complete Implementation

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

// Content is hard-coded — do not fetch
const COMPANY = { /* paste const above */ };

export function ChampInfoScreen({ navigation }: any) {
  function openUrl(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  function tapCall() {
    Linking.openURL(`tel:${COMPANY.phone.replace(/\D/g, '')}`).catch(() => {});
  }

  function tapEmail() {
    Linking.openURL(`mailto:${COMPANY.email}`).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>Champtron Systems LLC</Text>
          <Text style={styles.tagline}>{COMPANY.tagline}</Text>
          <Text style={styles.location}>{COMPANY.location}</Text>
        </View>

        {/* About */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About Us</Text>
          <Text style={styles.body}>{COMPANY.about}</Text>
        </Card>

        {/* Services */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <View style={styles.serviceGrid}>
            {COMPANY.services.map((s) => (
              <View key={s} style={styles.servicePill}>
                <Text style={styles.serviceText}>{s}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Value Props */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Us</Text>
          {COMPANY.valueProps.map((vp) => (
            <View key={vp.label} style={styles.valueRow}>
              <Text style={styles.valueIcon}>{vp.icon}</Text>
              <Text style={styles.valueLabel}>{vp.label}</Text>
            </View>
          ))}
        </Card>

        {/* Contact */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <TouchableOpacity onPress={tapCall} style={styles.contactRow}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactLink}>{COMPANY.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={tapEmail} style={styles.contactRow}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactLink}>{COMPANY.email}</Text>
          </TouchableOpacity>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Hours</Text>
            <Text style={styles.contactValue}>{COMPANY.hours}</Text>
          </View>
        </Card>

        {/* CTA */}
        <Button
          title="Book a Free Consultation"
          onPress={() => openUrl(COMPANY.contactUrl)}
          style={styles.cta}
        />
        <Button
          title="Visit Our Website"
          variant="secondary"
          onPress={() => openUrl(COMPANY.website)}
          style={styles.ctaSecondary}
        />

        {/* Back to Home */}
        <Button
          title="Go to Home"
          variant="ghost"
          onPress={() => navigation.navigate('Tabs')}
          style={styles.homeBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 48, gap: 16 },

  header: { alignItems: 'center', paddingVertical: 24 },
  brand: {
    color: colors.cyan,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    marginBottom: 4,
  },
  location: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
  },

  section: { gap: 12 },
  sectionTitle: {
    color: colors.muted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
  },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  servicePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  serviceText: {
    color: colors.cyan,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },

  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  valueIcon: { fontSize: 18 },
  valueLabel: { color: colors.text, fontSize: typography.sizes.sm },

  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabel: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  contactLink: {
    color: colors.cyan,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textDecorationLine: 'underline',
  },
  contactValue: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },

  cta: { marginTop: 8 },
  ctaSecondary: { marginTop: 8 },
  homeBtn: { marginTop: 4, marginBottom: 16 },
});
```

#### Behavior Rules

- `Linking.openURL()` is used for tap-to-call, tap-to-email, and CTA buttons.
- Phone `tel:` link strips non-digits before dialing.
- All external links open in the device's default browser / phone app.
- "Go to Home" navigates to `Tabs` (the bottom tab navigator root).
- This screen is reachable from the onboarding gate (No/No path) and can also be linked from the Home screen if the product owner wants to add it later.

#### Acceptance Criteria

- [ ] Company name, tagline, and location displayed in header
- [ ] About section rendered with correct body text
- [ ] All 9 services rendered as pills in a wrap-friendly grid
- [ ] All 5 value props rendered with icons and labels
- [ ] Phone tap fires `tel:8104070773` via `Linking.openURL`
- [ ] Email tap fires `mailto:info@champtron-systems.com` via `Linking.openURL`
- [ ] "Book a Free Consultation" opens `https://www.champtron-systems.com/#contact`
- [ ] "Visit Our Website" opens `https://www.champtron-systems.com`
- [ ] "Go to Home" navigates to the tab navigator root without replacing the stack
- [ ] No network requests made — all content is hard-coded
- [ ] Screen renders correctly on both iOS and Android (test in Expo Go)

---

### Feature 3: Mobile — Navigation & Auth Refactor

**Read-ahead hints for Wasp:**
Before writing Feature 3, pre-load in parallel:
- Feature 1 output (OnboardingGateScreen is now registered)
- Feature 2 output (ChampInfoScreen is now registered)
- `mobile/src/navigation/AuthNavigator.tsx`
- `mobile/src/navigation/AppNavigator.tsx`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/store/authStore.ts`
- `mobile/src/screens/HomeScreen.tsx`

**Estimated Hours:** ~9 hrs

#### Overview

This feature is a coordinated refactor across 8 existing files. The goal is to remove the pre-login StageGate paradigm entirely and replace it with a post-login onboarding gate that fires once. The `pendingStartupRedirect` Zustand state, the `isStartup` navigation param, and the StageGate screen are all removed.

#### Files to Modify

**1. `mobile/src/store/authStore.ts`**

Remove `pendingStartupRedirect` field and `setPendingStartupRedirect` action. Add `onboardingComplete: boolean` field. The field is initialized to `false` and set to `true` by the navigator after reading AsyncStorage.

```typescript
// REMOVE these from AuthState interface:
pendingStartupRedirect: boolean;
setPendingStartupRedirect: (val: boolean) => void;

// ADD to AuthState interface:
/** Cached in-memory copy of AsyncStorage onboardingComplete flag. */
onboardingComplete: boolean;
setOnboardingComplete: (val: boolean) => void;
```

Full updated store:

```typescript
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
  /** In-memory mirror of AsyncStorage 'onboardingComplete'. Set by RootNavigator on init. */
  onboardingComplete: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, businessName: string) => Promise<void>;
  logout: () => Promise<void>;
  setIsPaid: (paid: boolean) => void;
  clearError: () => void;
  setOnboardingComplete: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoggedIn: false,
  isPaid: false,
  isLoading: false,
  error: null,
  onboardingComplete: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        const user = await getMe(token);
        set({ token, user, isLoggedIn: true });
      }
    } catch {
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
    set({ token: null, user: null, isLoggedIn: false, isPaid: false, onboardingComplete: false });
  },

  setIsPaid: (paid) => set({ isPaid: paid }),
  clearError: () => set({ error: null }),
  setOnboardingComplete: (val) => set({ onboardingComplete: val }),
}));
```

Note: `logout` resets `onboardingComplete` to `false` in memory. AsyncStorage is NOT cleared on logout — the gate should still only show once per device even after logout/login. If the product owner wants to reset onboarding on logout in the future, that is a deliberate future decision.

---

**2. `mobile/src/navigation/AuthNavigator.tsx`**

Remove `StageGate` screen entirely. Make `Login` the initial route. Remove `isStartup` param from both `Login` and `Signup`.

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerBackTitle: '',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Sign In' }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ title: 'Create Account' }}
      />
    </Stack.Navigator>
  );
}
```

Note: The lazy-import wrapper pattern from the original file is not needed after this cleanup; direct imports are fine.

---

**3. `mobile/src/navigation/RootNavigator.tsx`**

Read `onboardingComplete` from AsyncStorage during `initialize`. Pass the result to `setOnboardingComplete`. When logged in, conditionally render `OnboardingGate` or `AppNavigator` based on `onboardingComplete`.

```typescript
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { OnboardingGateScreen } from '../screens/onboarding/OnboardingGateScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();
const ONBOARDING_KEY = 'onboardingComplete';

export function RootNavigator() {
  const { isLoggedIn, onboardingComplete, initialize, setOnboardingComplete } = useAuthStore();

  useEffect(() => {
    async function boot() {
      await initialize();
      const val = await AsyncStorage.getItem(ONBOARDING_KEY);
      setOnboardingComplete(val === 'true');
    }
    boot();
  }, []);

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.cyan,
          background: colors.background,
          card: colors.panel,
          text: colors.text,
          border: colors.border,
          notification: colors.red,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          onboardingComplete ? (
            <Stack.Screen name="App" component={AppNavigator} />
          ) : (
            <Stack.Screen name="OnboardingGate" component={OnboardingGateScreen} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Important navigation note:** The `OnboardingGateScreen` inside `RootNavigator` is a top-level stack screen, not inside `AppNavigator`. When `OnboardingGateScreen` calls `navigation.replace('AssessmentForm')`, this will NOT work because `AssessmentForm` is registered in `AppNavigator`'s stack, not in this root stack.

Correct approach: After the user answers Q1 or Q2, `OnboardingGateScreen` calls `setOnboardingComplete(true)` from `useAuthStore()` in addition to calling `AsyncStorage.setItem`. This triggers `RootNavigator` to re-render and switch to `AppNavigator`. Then the app lands on `AppNavigator`'s initial screen (`Tabs`).

For deep-routing to the correct first screen (e.g., `AssessmentForm` for YES on Q1), `AppNavigator` must detect a pending route from the store.

Add a `pendingRoute` field to authStore:

```typescript
// ADD to AuthState:
pendingRoute: 'AssessmentForm' | 'StartupStep1' | 'ChampInfo' | null;
setPendingRoute: (route: 'AssessmentForm' | 'StartupStep1' | 'ChampInfo' | null) => void;
```

`OnboardingGateScreen` sets `pendingRoute` then calls `setOnboardingComplete(true)`. `AppNavigator`'s `TabNavigator` root (or `HomeScreen`) detects `pendingRoute` in a `useEffect`, navigates, then clears it.

Full updated `OnboardingGateScreen` handlers:

```typescript
// In OnboardingGateScreen — updated handlers that use the store
import { useAuthStore } from '../../store/authStore';
// ...
const { setOnboardingComplete, setPendingRoute } = useAuthStore();

async function handleQ1Yes() {
  await markComplete();
  setPendingRoute('AssessmentForm');
  setOnboardingComplete(true); // triggers RootNavigator re-render
}

async function handleQ1No() {
  setStep(2);
}

async function handleQ2Yes() {
  await markComplete();
  setPendingRoute('StartupStep1');
  setOnboardingComplete(true);
}

async function handleQ2No() {
  await markComplete();
  setPendingRoute('ChampInfo');
  setOnboardingComplete(true);
}
```

`HomeScreen` (or `AppNavigator` via a wrapper) handles the pending route:

```typescript
// In HomeScreen.tsx — replace pendingStartupRedirect useEffect with pendingRoute handling
const { pendingRoute, setPendingRoute } = useAuthStore();

useEffect(() => {
  if (pendingRoute) {
    const route = pendingRoute;
    setPendingRoute(null);
    navigation.navigate(route as any);
  }
}, [pendingRoute]);
```

This pattern avoids the cross-stack navigation problem while keeping routing logic in the navigator, not in screens.

---

**4. `mobile/src/navigation/AppNavigator.tsx`**

Add `OnboardingGate`, `ChampInfo` to `AppStackParamList`. Register `ChampInfoScreen`. No change needed for other screens.

```typescript
// Add to AppStackParamList:
ChampInfo: undefined;
// OnboardingGate is NOT in AppStackParamList — it lives in RootNavigator

// Add import:
import { ChampInfoScreen } from '../screens/ChampInfoScreen';

// Add screen registration in AppNavigator Stack.Navigator:
<Stack.Screen name="ChampInfo" component={ChampInfoScreen} />
```

---

**5. `mobile/src/screens/HomeScreen.tsx`**

Replace the `pendingStartupRedirect` useEffect with a `pendingRoute` useEffect. Remove destructuring of `setPendingStartupRedirect`. Remove the "Starting a Business?" button (routing is now handled by the onboarding gate; users who want the startup path can re-access it from the Profile or a dedicated menu in a future sprint).

```typescript
// REMOVE from destructuring:
const { user, token, pendingStartupRedirect, setPendingStartupRedirect } = useAuthStore();

// REPLACE with:
const { user, token, pendingRoute, setPendingRoute } = useAuthStore();

// REPLACE the pendingStartupRedirect useEffect with:
useEffect(() => {
  if (pendingRoute) {
    const route = pendingRoute;
    setPendingRoute(null);
    navigation.navigate(route as any);
  }
}, [pendingRoute]);

// REMOVE this Button entirely:
<Button
  title="Starting a Business?"
  variant="secondary"
  onPress={() => navigation.navigate('StartupStep1')}
  style={styles.startupBtn}
/>

// REMOVE the startupBtn style entry
```

---

**6. `mobile/src/screens/auth/LoginScreen.tsx`**

Remove `isStartup` param, remove `setPendingStartupRedirect` usage. Simplify to plain email/password login.

```typescript
// REMOVE from imports:
// { isStartup } param reading
// setPendingStartupRedirect from useAuthStore

// CHANGE type:
type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
// (no change needed — Login: undefined now)

// REMOVE from handleLogin:
// if (isStartup) { setPendingStartupRedirect(true); }
// and the catch: setPendingStartupRedirect(false);

// REMOVE from Button:
// onPress={() => navigation.navigate('Signup', { isStartup })}
// REPLACE with:
// onPress={() => navigation.navigate('Signup')}
```

---

**7. `mobile/src/screens/auth/SignupScreen.tsx`**

Same cleanup as LoginScreen — remove `isStartup` param and `setPendingStartupRedirect`.

```typescript
// Same changes as LoginScreen — remove isStartup, setPendingStartupRedirect
// Update Signup link: navigation.navigate('Login') instead of ('Login', { isStartup })
```

---

**8. `mobile/src/screens/StageGateScreen.tsx`**

This file is no longer used. Do NOT delete it in this sprint (leave it for a cleanup sprint). Instead, strip it to a minimal stub that renders nothing, to avoid broken imports during transition:

```typescript
// mobile/src/screens/StageGateScreen.tsx — stubbed, safe to delete after SPRINT-006
import React from 'react';
import { View } from 'react-native';
export function StageGateScreen() { return <View />; }
```

#### Updated AuthState Interface (complete)

```typescript
interface AuthState {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  isPaid: boolean;
  isLoading: boolean;
  error: string | null;
  onboardingComplete: boolean;
  pendingRoute: 'AssessmentForm' | 'StartupStep1' | 'ChampInfo' | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, businessName: string) => Promise<void>;
  logout: () => Promise<void>;
  setIsPaid: (paid: boolean) => void;
  clearError: () => void;
  setOnboardingComplete: (val: boolean) => void;
  setPendingRoute: (route: 'AssessmentForm' | 'StartupStep1' | 'ChampInfo' | null) => void;
}
```

#### Acceptance Criteria

- [ ] `AuthNavigator` starts directly on `Login` screen — no StageGate
- [ ] `AuthStackParamList` `Login` and `Signup` types are `undefined` (no params)
- [ ] `LoginScreen` compiles without `isStartup` or `setPendingStartupRedirect` references
- [ ] `SignupScreen` compiles without `isStartup` or `setPendingStartupRedirect` references
- [ ] `HomeScreen` no longer references `pendingStartupRedirect` or shows "Starting a Business?" button
- [ ] `authStore.ts` does not contain `pendingStartupRedirect` or `setPendingStartupRedirect`
- [ ] `RootNavigator` shows `OnboardingGateScreen` when `isLoggedIn && !onboardingComplete`
- [ ] `RootNavigator` shows `AppNavigator` when `isLoggedIn && onboardingComplete`
- [ ] After answering the gate, `pendingRoute` is consumed by `HomeScreen` and cleared
- [ ] App builds without TypeScript errors (`npx tsc --noEmit` passes)
- [ ] `StageGateScreen.tsx` exists as a stub (no deletion yet)

---

### Feature 4: Web — Post-Login Onboarding Modal

**Read-ahead hints for Wasp:**
Before writing Feature 4, pre-load in parallel:
- `app.js` (full file) — Auth.onAuthChange pattern at line ~932, isPaid global, updateTierUI
- `index.html` — existing DOM structure, modal IDs, auth controls
- `styles.css` — existing CSS variables and modal patterns

**Estimated Hours:** ~5 hrs

#### Overview

Add a post-login onboarding modal to the web SaaS frontend (`index.html` + `app.js`). The modal fires once per browser after first login, is stored in `localStorage`, and presents the same Q1/Q2 Yes/No flow as the mobile gate.

**Constraint:** No new framework, build step, or external dependency. Plain vanilla JS + HTML + CSS only. The original static anonymous tool is NOT touched.

#### Files to Modify

- `index.html` — add modal HTML structure
- `app.js` — add onboarding gate logic (new section, clearly delimited)
- `styles.css` — add modal styles using existing CSS variables

#### LocalStorage Key

```
'onboardingComplete'   // value: 'true' (string)
```

#### Modal Flow States

```
State: 'q1'      → shows Q1 question
State: 'q2'      → shows Q2 question  
State: 'champ'   → shows Champtron Systems info panel
State: 'done'    → modal dismissed
```

#### HTML to Add to `index.html`

Add this immediately before the closing `</body>` tag:

```html
<!-- ── Onboarding Gate Modal (SPRINT-005) ── -->
<div id="onboardingModal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="onboardingModalTitle">
  <div class="modal-box onboarding-modal">

    <!-- Q1 Panel -->
    <div id="onboardingQ1" class="onboarding-panel">
      <p class="eyebrow">Step 1 of 2</p>
      <h2 id="onboardingModalTitle">Are you seeking advice on your current or existing business?</h2>
      <p class="muted">This helps us route you to the right assessment.</p>
      <div class="modal-btn-row">
        <button class="button primary" onclick="onboardingQ1Yes()">Yes</button>
        <button class="button secondary" onclick="onboardingQ1No()">No</button>
      </div>
    </div>

    <!-- Q2 Panel -->
    <div id="onboardingQ2" class="onboarding-panel hidden">
      <button class="link-btn" onclick="onboardingBack()">&larr; Back</button>
      <p class="eyebrow">Step 2 of 2</p>
      <h2>Are you looking for advice on starting a new business?</h2>
      <p class="muted">We offer a guided launch readiness assessment for new entrepreneurs.</p>
      <div class="modal-btn-row">
        <button class="button primary" onclick="onboardingQ2Yes()">Yes</button>
        <button class="button secondary" onclick="onboardingQ2No()">No</button>
      </div>
    </div>

    <!-- Champtron Info Panel -->
    <div id="onboardingChamp" class="onboarding-panel hidden">
      <div class="champ-header">
        <h2>Champtron Systems LLC</h2>
        <p class="champ-tagline">Advanced IT Solutions for Modern Businesses</p>
        <p class="muted">Sanford, FL</p>
      </div>
      <p class="champ-about">
        Local IT solutions provider specializing in automation, networking,
        infrastructure as code, and AI technologies to help businesses optimize
        operations. Security-first mindset.
      </p>
      <div class="champ-services">
        <p class="label">Our Services</p>
        <div class="champ-service-grid">
          <span class="service-pill">IT Automation</span>
          <span class="service-pill">Network Solutions</span>
          <span class="service-pill">Infrastructure as Code</span>
          <span class="service-pill">Zero Trust Security</span>
          <span class="service-pill">AI Solutions</span>
          <span class="service-pill">Data Management</span>
          <span class="service-pill">Cybersecurity</span>
          <span class="service-pill">Custom Application Development</span>
          <span class="service-pill">Website Development</span>
        </div>
      </div>
      <div class="champ-contact">
        <p><strong>Phone:</strong> <a href="tel:8104070773">(810) 407-0773</a></p>
        <p><strong>Email:</strong> <a href="mailto:info@champtron-systems.com">info@champtron-systems.com</a></p>
        <p class="muted">Mon–Fri 8AM–6PM &nbsp;|&nbsp; Sat 9AM–2PM</p>
      </div>
      <div class="modal-btn-row">
        <a href="https://www.champtron-systems.com/#contact" target="_blank" rel="noopener" class="button primary">Book a Free Consultation</a>
        <a href="https://www.champtron-systems.com" target="_blank" rel="noopener" class="button secondary">Visit Website</a>
      </div>
      <button class="button ghost" style="margin-top:12px;width:100%" onclick="onboardingDone()">Continue to App</button>
    </div>

  </div>
</div>
```

#### JS to Add to `app.js`

Add a new clearly-delimited section after the existing Auth.onAuthChange block (around line 938):

```javascript
// ── Onboarding Gate (SPRINT-005) ─────────────────────────────────────────────

const ONBOARDING_KEY = 'onboardingComplete';

function shouldShowOnboarding() {
  return localStorage.getItem(ONBOARDING_KEY) !== 'true';
}

function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

function showOnboardingModal() {
  const modal = document.getElementById('onboardingModal');
  if (!modal) return;
  // Reset to Q1 state
  document.getElementById('onboardingQ1').classList.remove('hidden');
  document.getElementById('onboardingQ2').classList.add('hidden');
  document.getElementById('onboardingChamp').classList.add('hidden');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function hideOnboardingModal() {
  const modal = document.getElementById('onboardingModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

window.onboardingQ1Yes = function() {
  // Existing business path — dismiss modal, stay on assessment
  markOnboardingComplete();
  hideOnboardingModal();
  // Scroll to assessment section (current flow)
  document.getElementById('assessment')?.scrollIntoView({ behavior: 'smooth' });
};

window.onboardingQ1No = function() {
  // Show Q2
  document.getElementById('onboardingQ1').classList.add('hidden');
  document.getElementById('onboardingQ2').classList.remove('hidden');
};

window.onboardingBack = function() {
  // Back to Q1
  document.getElementById('onboardingQ2').classList.add('hidden');
  document.getElementById('onboardingQ1').classList.remove('hidden');
};

window.onboardingQ2Yes = function() {
  // Startup path — show placeholder (startup web path not yet built)
  markOnboardingComplete();
  hideOnboardingModal();
  // Show a temporary notice
  const notice = document.createElement('div');
  notice.className = 'startup-notice';
  notice.innerHTML = `
    <div class="panel" style="margin:24px auto;max-width:600px;padding:24px;text-align:center">
      <h3 style="color:var(--green)">Starting a Business?</h3>
      <p class="muted">Our guided startup assessment is coming soon on web. 
      In the meantime, try the <strong>Champ Compass mobile app</strong> 
      (Expo Go) for the full startup readiness assessment.</p>
    </div>
  `;
  // Insert after nav
  document.querySelector('nav')?.after(notice);
  notice.scrollIntoView({ behavior: 'smooth' });
};

window.onboardingQ2No = function() {
  // Show Champtron info panel
  document.getElementById('onboardingQ2').classList.add('hidden');
  document.getElementById('onboardingChamp').classList.remove('hidden');
  // Note: markOnboardingComplete is called on "Continue to App" below
};

window.onboardingDone = function() {
  // Dismiss Champtron panel
  markOnboardingComplete();
  hideOnboardingModal();
};

// Hook into existing auth change listener
// Extend the existing Auth.onAuthChange block to include onboarding check
// IMPORTANT: do not replace the existing listener — extend it
if (typeof Auth !== 'undefined') {
  const _existingAuthChange = Auth._onAuthChangeCallback;
  Auth.onAuthChange(({ loggedIn }) => {
    if (loggedIn && shouldShowOnboarding()) {
      // Small delay to let the UI settle after login
      setTimeout(showOnboardingModal, 300);
    }
  });
}
```

**Note on Auth.onAuthChange hook:** The existing `app.js` registers an `Auth.onAuthChange` listener at line ~932. Check whether `Auth.onAuthChange` allows multiple registrations or overwrites. If it overwrites, the new listener must call `loadAssessmentHistory()` and `checkTierAndShowUpgrade()` in addition to the onboarding check. Do NOT break existing auth-login behaviors. Read the `auth.js` implementation of `onAuthChange` before deciding.

If `onAuthChange` supports only one callback, merge the new behavior into the existing callback:

```javascript
Auth.onAuthChange(({ loggedIn }) => {
  if (loggedIn) {
    loadAssessmentHistory();
    checkTierAndShowUpgrade();
    if (shouldShowOnboarding()) {
      setTimeout(showOnboardingModal, 300);
    }
  }
});
```

#### CSS to Add to `styles.css`

```css
/* ── Onboarding Gate Modal (SPRINT-005) ─────────────────────── */

.onboarding-modal {
  max-width: 540px;
  width: 90%;
}

.onboarding-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.onboarding-panel h2 {
  color: var(--text);
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.4;
  margin: 0;
}

.modal-btn-row {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.modal-btn-row .button {
  flex: 1;
}

.link-btn {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
  text-decoration: underline;
  align-self: flex-start;
}

.link-btn:hover { color: var(--text); }

/* Champtron Info Panel */
.champ-header { text-align: center; }
.champ-header h2 { color: var(--cyan); }
.champ-tagline {
  color: var(--text);
  font-size: 1rem;
  font-weight: 600;
  margin: 4px 0;
}
.champ-about {
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.6;
}
.champ-services .label {
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}
.champ-service-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.service-pill {
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(34, 211, 238, 0.08);
  border: 1px solid rgba(34, 211, 238, 0.25);
  color: var(--cyan);
  font-size: 0.78rem;
  font-weight: 600;
}
.champ-contact p {
  color: var(--text);
  font-size: 0.875rem;
  margin: 6px 0;
}
.champ-contact a { color: var(--cyan); }

.startup-notice { animation: fadeIn 0.3s ease; }
```

**Assumption:** `index.html` already has a `.modal-overlay` and `.modal-box` CSS pattern from Sprint 3 auth modals. If that pattern does not exist in `styles.css`, Wasp must add it:

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay, rgba(7,17,31,0.85));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal-overlay.hidden { display: none; }
.modal-box {
  background: var(--panel);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 90vh;
  overflow-y: auto;
}
```

#### Behavior Rules

- Modal fires only when `Auth.isLoggedIn()` is true AND `localStorage.getItem('onboardingComplete') !== 'true'`
- Firing is triggered inside `Auth.onAuthChange` callback — NOT on page load
- Q1 YES → dismiss modal, scroll to `#assessment`
- Q1 NO → show Q2 panel (no modal close)
- Back on Q2 → show Q1 panel
- Q2 YES → dismiss modal, show inline "coming soon" startup notice
- Q2 NO → show Champtron info panel inside the modal
- Champtron panel "Continue to App" → close modal, set `onboardingComplete`
- Champtron panel CTA links open in `target="_blank" rel="noopener"`
- `localStorage.setItem` is called on every terminal path (YES answers and "Continue to App")
- The modal is hidden (via `.hidden` class) by default on page load
- The anonymous tool (users not logged in) never sees the modal

#### Acceptance Criteria

- [ ] Modal is hidden on page load for anonymous users
- [ ] Modal appears after login if `onboardingComplete` not set in localStorage
- [ ] Modal does not appear after login if `onboardingComplete === 'true'`
- [ ] Q1 YES dismisses modal, scrolls to `#assessment`, sets localStorage
- [ ] Q1 NO hides Q1 panel and shows Q2 panel within the same modal
- [ ] Back button on Q2 hides Q2 and shows Q1
- [ ] Q2 YES dismisses modal, shows "coming soon" startup notice, sets localStorage
- [ ] Q2 NO shows Champtron info panel within the modal (no new page)
- [ ] Champtron "Book a Free Consultation" links to `https://www.champtron-systems.com/#contact` (opens new tab)
- [ ] Champtron "Visit Website" links to `https://www.champtron-systems.com` (opens new tab)
- [ ] "Continue to App" on Champtron panel closes modal, sets localStorage
- [ ] All 9 services render as pills in the Champtron panel
- [ ] Existing `loadAssessmentHistory()` and `checkTierAndShowUpgrade()` still fire on login
- [ ] No JS framework, no new build step, no new external dependencies
- [ ] Static `index.html` anonymous tool (no auth) is completely unaffected

---

### Feature 5: Tests

**Read-ahead hints for Wasp:**
Before writing Feature 5, pre-load in parallel:
- Feature 1 output (OnboardingGateScreen)
- Feature 2 output (ChampInfoScreen)
- Feature 3 output (authStore, RootNavigator, HomeScreen, AuthNavigator)
- Any existing test files: `mobile/src/**/__tests__/` to match testing patterns

**Estimated Hours:** ~3 hrs

#### Overview

Unit tests for the new mobile screens and refactored store. Web onboarding JS is tested via basic behavior assertions using JSDOM if available, or documented as manual QA if not.

#### Test Files to Create

**`mobile/src/screens/onboarding/__tests__/OnboardingGateScreen.test.tsx`**

```typescript
// Tests for OnboardingGateScreen
// Use React Native Testing Library (@testing-library/react-native)

describe('OnboardingGateScreen', () => {
  // [ ] Renders Q1 on mount; Q2 is not visible
  // [ ] Pressing YES on Q1: calls AsyncStorage.setItem('onboardingComplete', 'true')
  // [ ] Pressing YES on Q1: calls setPendingRoute('AssessmentForm')
  // [ ] Pressing YES on Q1: calls setOnboardingComplete(true)
  // [ ] Pressing NO on Q1: shows Q2 question text; Q1 question is hidden
  // [ ] Pressing Back on Q2: shows Q1 question text; Q2 is hidden
  // [ ] Pressing YES on Q2: calls AsyncStorage.setItem, setPendingRoute('StartupStep1'), setOnboardingComplete(true)
  // [ ] Pressing NO on Q2: calls AsyncStorage.setItem, setPendingRoute('ChampInfo'), setOnboardingComplete(true)
  // [ ] Step indicator shows 'Step 1 of 2' on Q1
  // [ ] Step indicator shows 'Step 2 of 2' on Q2
});
```

Mock `AsyncStorage` using `@react-native-async-storage/async-storage/jest/async-storage-mock`. Mock `useAuthStore` return values for `setOnboardingComplete` and `setPendingRoute`.

**`mobile/src/screens/__tests__/ChampInfoScreen.test.tsx`**

```typescript
describe('ChampInfoScreen', () => {
  // [ ] Renders company name 'Champtron Systems LLC'
  // [ ] Renders tagline 'Advanced IT Solutions for Modern Businesses'
  // [ ] Renders all 9 service names
  // [ ] Renders all 5 value prop labels
  // [ ] Phone touchable fires Linking.openURL with 'tel:8104070773'
  // [ ] Email touchable fires Linking.openURL with 'mailto:info@champtron-systems.com'
  // [ ] 'Book a Free Consultation' fires Linking.openURL with correct URL
  // [ ] 'Go to Home' calls navigation.navigate('Tabs')
});
```

Mock `Linking.openURL`. Mock `navigation` prop.

**`mobile/src/store/__tests__/authStore.test.ts`**

```typescript
describe('authStore — onboardingComplete + pendingRoute', () => {
  // [ ] Initial state: onboardingComplete === false
  // [ ] Initial state: pendingRoute === null
  // [ ] setOnboardingComplete(true) updates state to true
  // [ ] setPendingRoute('AssessmentForm') updates state to 'AssessmentForm'
  // [ ] setPendingRoute(null) clears route
  // [ ] logout() resets onboardingComplete to false
  // [ ] logout() resets pendingRoute to null
  // [ ] pendingStartupRedirect does NOT exist in state (regression guard)
  // [ ] setPendingStartupRedirect does NOT exist in state (regression guard)
});
```

#### Manual QA Checklist (web, no automated tests required)

- [ ] Log in as a new user (no `onboardingComplete` in localStorage) — modal appears
- [ ] Click YES on Q1 — modal closes, page scrolls to assessment
- [ ] Clear localStorage, log in again — modal appears again
- [ ] Set `localStorage.setItem('onboardingComplete', 'true')`, log out, log back in — modal does NOT appear
- [ ] Click NO on Q1, verify Q2 appears and Q1 is hidden
- [ ] Click Back on Q2, verify Q1 appears and Q2 is hidden
- [ ] Click YES on Q2 — startup notice appears below nav
- [ ] Click NO on Q2 — Champtron panel appears in modal
- [ ] Click "Book a Free Consultation" — new tab opens to correct URL
- [ ] Click "Continue to App" — modal closes, localStorage set
- [ ] Confirm anonymous (not logged in) user never sees the modal

#### Acceptance Criteria

- [ ] All `describe` blocks above have passing test implementations
- [ ] `AsyncStorage` is mocked — no real storage calls in tests
- [ ] `Linking` is mocked — no real device calls in tests
- [ ] `authStore` test asserts `pendingStartupRedirect` does NOT exist (regression guard)
- [ ] Tests run with `npx jest` without additional config

---

## Implementation Checklist

| # | Item | Est | Done |
|---|------|-----|------|
| 1 | Create `mobile/src/screens/onboarding/OnboardingGateScreen.tsx` | 4 hrs | [ ] |
| 2 | Wire AsyncStorage, step state, navigation.replace in OnboardingGateScreen | 2 hrs | [ ] |
| 3 | Wire `useAuthStore` calls (setOnboardingComplete, setPendingRoute) in OnboardingGateScreen | 1 hr | [ ] |
| 4 | Create `mobile/src/screens/ChampInfoScreen.tsx` with all content, Linking calls, styles | 3 hrs | [ ] |
| 5 | Wire ChampInfo "Go to Home" navigation | 30 min | [ ] |
| 6 | Update `authStore.ts` — add `onboardingComplete`, `pendingRoute`, remove `pendingStartupRedirect` | 1 hr | [ ] |
| 7 | Update `AuthNavigator.tsx` — remove StageGate, set Login as initialRouteName, remove isStartup params | 30 min | [ ] |
| 8 | Update `RootNavigator.tsx` — read AsyncStorage on boot, conditional OnboardingGate render | 1.5 hrs | [ ] |
| 9 | Update `AppNavigator.tsx` — add ChampInfo screen registration | 30 min | [ ] |
| 10 | Update `HomeScreen.tsx` — replace pendingStartupRedirect with pendingRoute, remove startup button | 1 hr | [ ] |
| 11 | Update `LoginScreen.tsx` — remove isStartup param and setPendingStartupRedirect | 30 min | [ ] |
| 12 | Update `SignupScreen.tsx` — remove isStartup param and setPendingStartupRedirect | 30 min | [ ] |
| 13 | Stub `StageGateScreen.tsx` | 10 min | [ ] |
| 14 | Add onboarding modal HTML to `index.html` | 45 min | [ ] |
| 15 | Add onboarding JS section to `app.js` (with Auth.onAuthChange integration) | 2 hrs | [ ] |
| 16 | Add onboarding CSS to `styles.css` (+ modal-overlay base if missing) | 1 hr | [ ] |
| 17 | Write `OnboardingGateScreen.test.tsx` | 1.5 hrs | [ ] |
| 18 | Write `ChampInfoScreen.test.tsx` | 45 min | [ ] |
| 19 | Write `authStore.test.ts` (onboardingComplete + pendingRoute) | 45 min | [ ] |
| 20 | Manual QA checklist — web (11 items) | 30 min | [ ] |
| 21 | `npx tsc --noEmit` passes | 15 min | [ ] |

**Total estimated: ~30 hrs**

---

## Assumptions & Open Questions

| # | Assumption | If Wrong |
|---|-----------|----------|
| A1 | `@react-native-async-storage/async-storage` is already installed in the mobile project | Run `npx expo install @react-native-async-storage/async-storage` if missing |
| A2 | `Auth.onAuthChange()` in `auth.js` supports being called multiple times (multiple subscribers) | Merge new onboarding call into the single existing callback |
| A3 | `.modal-overlay` and `.modal-box` CSS classes exist from Sprint 3 auth modals in `styles.css` | Add base modal CSS (provided in Feature 4 spec above) |
| A4 | `AppNavigator` uses `navigation.navigate('Tabs')` to get back to the tab bar | Adjust target name if `AppNavigator` uses a different route name for the tab root |
| A5 | The product owner wants `onboardingComplete` to survive logout (gate shows only once per device total, not once per login) | If per-login behavior is wanted, clear AsyncStorage/localStorage on logout |
| A6 | The startup assessment web path is not yet built — Q2 YES shows a "coming soon" placeholder | Replace placeholder with real startup routing once web startup path is built |
| A7 | `StageGateScreen.tsx` is left as a stub rather than deleted, to avoid orphaned navigation references that may exist in places not visible in this sprint | Delete in SPRINT-006 cleanup |

---

## Deferred to SPRINT-006

The following items from the original SPRINT-005-existing-business.md are explicitly deferred:

| Deferred Item | Reason |
|--------------|--------|
| AssessmentFormScreen step-by-step refactor into `existing/` screens | Requires separate sprint — unrelated to onboarding gate |
| `draftStore` wiring for assessment form | Same as above |
| Backend `createAssessment` payload shape fix | Backend change — separate sprint |
| 30/60/90 roadmap screen | Requires assessment data — dependent on form refactor |

---

## Notes for AI Agents (Wasp)

- Execute features in numbered order (1 → 2 → 3 → 4 → 5). Features 1 and 2 can be written in parallel before Feature 3, since Feature 3 only registers them.
- Feature 3 is the most complex — it touches 8 files and has a cross-stack navigation challenge. Read the navigation architecture notes carefully before writing.
- The `pendingRoute` + `setOnboardingComplete` pattern in Feature 3 is the correct solution to the cross-stack routing problem. Do not attempt `navigation.replace('AssessmentForm')` from inside `RootNavigator`'s onboarding screen — it will fail at runtime.
- Feature 4 (web) is fully independent of Features 1–3. It can be written in parallel with Feature 3 if Wasp supports parallel file writes.
- Check whether `Auth.onAuthChange` in `auth.js` supports multiple subscribers before deciding how to integrate the onboarding check. Merge into the existing block if it does not.
- Do NOT introduce `import` statements or ES module syntax in `app.js` — the file uses plain script globals. All new functions must be declared with `function` or assigned to `window.*`.
- `localStorage.getItem(ONBOARDING_KEY)` returns `null` (not `false`) when not set. The check `!== 'true'` handles both null and any other value correctly.
- After completing all features, run `npx tsc --noEmit` in the `mobile/` directory to confirm zero TypeScript errors.

---

## Agent Hints

| Signal | Value | Agents |
|--------|-------|--------|
| Builder | wasp | Route to Wasp sprint builder |
| Auth-critical | no | Standard auth — no new auth patterns |
| External dependencies | AsyncStorage (mobile), Linking (mobile), localStorage (web) | Standard React Native + browser APIs |
| State machine | OnboardingGate (step 1 / step 2 / done) | Hulk: invalid transition test (back from done) |
| Database writes | none | N/A |
| Financial/PII data | no | N/A |
| Migration | no | No schema changes in this sprint |
| Infrastructure needed | no | N/A |
| TypeScript regression | yes — pendingStartupRedirect removed | FRIDAY: check for dead references |
| Cross-stack navigation | yes — OnboardingGate in RootNavigator, deep route via pendingRoute store flag | Review navigation architecture notes in Feature 3 |

---

## Wasp Invocation

```
Use wasp. Build from sprint spec docs/specs/SPRINT-005-onboarding-gate.md
```
