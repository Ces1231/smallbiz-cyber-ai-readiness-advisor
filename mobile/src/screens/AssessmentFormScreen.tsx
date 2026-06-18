import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useAuthStore } from '../store/authStore';
import { createAssessment } from '../api/assessments';
import { StepPicker } from '../components/StepPicker';
import { ProgressBar } from '../components/ProgressBar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const DRAFT_KEY = 'assessment_draft';

const INDUSTRY_OPTIONS = [
  'Retail',
  'Healthcare',
  'Finance',
  'Technology',
  'Education',
  'Construction',
  'Other',
];

const SCORE_OPTIONS = [
  { label: 'None (0)', value: 0 },
  { label: 'Partial (1)', value: 1 },
  { label: 'Yes (2)', value: 2 },
];

interface FormData {
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

const defaultForm: FormData = {
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

// Steps: 0=intro, 1=cyber, 2=ai, 3=funding
const TOTAL_STEPS = 4;

export function AssessmentFormScreen({ navigation }: any) {
  const { token } = useAuthStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  // Load draft on mount
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          setForm((prev) => ({ ...prev, ...saved }));
        } catch {}
      }
    });
  }, []);

  // Save draft on every field change
  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const handleNext = () => {
    if (step === 0 && form.business_name.trim().length === 0) {
      Alert.alert('Required', 'Please enter your business name before continuing.');
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const result = await createAssessment(
        {
          business_name: form.business_name.trim(),
          industry: form.industry,
          mfa: form.mfa,
          backups: form.backups,
          training: form.training,
          digital_tools: form.digital_tools,
          automation: form.automation,
          ai_usage: form.ai_usage,
          documents: form.documents,
          online_presence: form.online_presence,
          growth_plan: form.growth_plan,
        },
        token
      );
      await AsyncStorage.removeItem(DRAFT_KEY);
      navigation.navigate('FreeScore', { assessmentId: result.id, assessment: result });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSide}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Assessment</Text>
        <View style={styles.headerSide} />
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <ProgressBar current={step + 1} total={TOTAL_STEPS} />
        <Text style={styles.progressText}>
          Step {step + 1} of {TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Business Information</Text>
              <Text style={styles.stepDesc}>
                Tell us about your business so we can personalize your readiness assessment.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Business Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.business_name}
                  onChangeText={(val) => updateField('business_name', val)}
                  placeholder="Enter your business name"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Industry</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={form.industry}
                    onValueChange={(val) => updateField('industry', val as string)}
                    style={styles.picker}
                    dropdownIconColor={colors.cyan}
                  >
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <Picker.Item key={opt} label={opt} value={opt} color={colors.text} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Cybersecurity Readiness</Text>
              <Text style={styles.stepDesc}>
                Rate your current implementation of key cybersecurity practices.
              </Text>
              <StepPicker
                label="Multi-Factor Authentication (MFA)"
                value={form.mfa}
                onChange={(val) => updateField('mfa', val)}
                options={SCORE_OPTIONS}
              />
              <StepPicker
                label="Data Backups"
                value={form.backups}
                onChange={(val) => updateField('backups', val)}
                options={SCORE_OPTIONS}
              />
              <StepPicker
                label="Security Training"
                value={form.training}
                onChange={(val) => updateField('training', val)}
                options={SCORE_OPTIONS}
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>AI &amp; Digital Tools</Text>
              <Text style={styles.stepDesc}>
                Tell us how your business uses digital technology and AI tools.
              </Text>
              <StepPicker
                label="Digital Tools Usage"
                value={form.digital_tools}
                onChange={(val) => updateField('digital_tools', val)}
                options={SCORE_OPTIONS}
              />
              <StepPicker
                label="Process Automation"
                value={form.automation}
                onChange={(val) => updateField('automation', val)}
                options={SCORE_OPTIONS}
              />
              <StepPicker
                label="AI Usage"
                value={form.ai_usage}
                onChange={(val) => updateField('ai_usage', val)}
                options={SCORE_OPTIONS}
              />
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Funding Readiness</Text>
              <Text style={styles.stepDesc}>
                Rate your preparation for accessing business funding and capital.
              </Text>
              <StepPicker
                label="Financial Documents"
                value={form.documents}
                onChange={(val) => updateField('documents', val)}
                options={SCORE_OPTIONS}
              />
              <StepPicker
                label="Online Presence"
                value={form.online_presence}
                onChange={(val) => updateField('online_presence', val)}
                options={SCORE_OPTIONS}
              />
              <StepPicker
                label="Growth Plan"
                value={form.growth_plan}
                onChange={(val) => updateField('growth_plan', val)}
                options={SCORE_OPTIONS}
              />
            </View>
          )}
        </Card>

        <View style={styles.navRow}>
          {step > 0 && (
            <Button
              title="Back"
              onPress={handleBack}
              variant="secondary"
              fullWidth={false}
              style={styles.navBtn}
            />
          )}
          {isLastStep ? (
            <Button
              title="Submit Assessment"
              onPress={handleSubmit}
              loading={submitting}
              fullWidth={false}
              style={[styles.navBtn, styles.flex1]}
            />
          ) : (
            <Button
              title="Next"
              onPress={handleNext}
              fullWidth={false}
              style={[styles.navBtn, styles.flex1]}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerSide: { minWidth: 64 },
  backText: { color: colors.cyan, fontSize: typography.sizes.md },
  headerTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  progressWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, gap: 6 },
  progressText: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    textAlign: 'right',
  },
  scroll: { padding: 20, gap: 20, paddingBottom: 48 },
  stepContent: { gap: 16 },
  stepTitle: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  stepDesc: {
    color: colors.muted,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.5,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: typography.sizes.base,
  },
  pickerWrap: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text,
    backgroundColor: 'transparent',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  navBtn: { minWidth: 110 },
  flex1: { flex: 1 },
});
