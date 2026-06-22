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
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// AppStackParamList is imported from AppNavigator — but OnboardingGateScreen
// sits in RootNavigator (not AppNavigator). We declare a minimal local type
// so this file compiles without a circular import.
type RootOnboardingParamList = {
  OnboardingGate: undefined;
};

type Props = NativeStackScreenProps<RootOnboardingParamList, 'OnboardingGate'>;

const ONBOARDING_KEY = 'onboardingComplete';

async function markComplete() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export function OnboardingGateScreen({ navigation }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const { setOnboardingComplete, setPendingRoute } = useAuthStore();

  async function handleQ1Yes() {
    await markComplete();
    setPendingRoute('AssessmentForm');
    setOnboardingComplete(true);
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
