import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useDraftStore } from '../../store/draftStore';
import { useAuthStore } from '../../store/authStore';
import { Toggle } from '../../components/Toggle';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { createStartupAssessment, StartupAssessmentRequest } from '../../api/startup';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const TOTAL_STEPS = 9;

export function StartupStep9Screen({ navigation }: any) {
  const { startupDraft, setStartupDraftField, clearStartupDraft } = useDraftStore();
  const { token } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const payload: StartupAssessmentRequest = {
        business_idea: startupDraft.business_idea,
        target_customer: startupDraft.target_customer,
        startup_budget: startupDraft.startup_budget,
        monthly_expenses: startupDraft.monthly_expenses,
        has_funding_source: startupDraft.has_funding_source ?? false,
        formation_type: startupDraft.formation_type,
        state_of_formation: startupDraft.state_of_formation,
        has_business_license: startupDraft.has_business_license ?? false,
        has_industry_permit: startupDraft.has_industry_permit ?? false,
        industry_type: startupDraft.industry_type,
        has_ein: startupDraft.has_ein ?? false,
        has_business_plan: startupDraft.has_business_plan ?? false,
        has_bank_account: startupDraft.has_bank_account ?? false,
        has_domain: startupDraft.has_domain ?? false,
        has_social_media: startupDraft.has_social_media ?? false,
        has_website: startupDraft.has_website ?? false,
        digital_tools_planned: startupDraft.digital_tools_planned ?? 0,
        automation_planned: startupDraft.automation_planned ?? 0,
        ai_usage_planned: startupDraft.ai_usage_planned ?? 0,
        password_manager_planned: startupDraft.password_manager_planned ?? false,
        backup_plan_exists: startupDraft.backup_plan_exists ?? false,
        has_growth_goals: startupDraft.has_growth_goals ?? false,
        revenue_target_year1: startupDraft.revenue_target_year1,
      };

      const result = await createStartupAssessment(payload, token);
      clearStartupDraft();
      navigation.navigate('StartupScore', { assessment: result });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressWrap}>
        <ProgressBar current={9} total={TOTAL_STEPS} />
        <Text style={styles.progressText}>Step 9 of {TOTAL_STEPS} — Growth Plan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Growth Plan</Text>
            <Text style={styles.stepDesc}>
              Founders who define growth goals early are significantly more likely to hit
              their revenue targets in year one. Tell us about your goals.
            </Text>

            <Toggle
              label="I have defined growth goals for year one"
              value={startupDraft.has_growth_goals ?? false}
              onValueChange={(val) => setStartupDraftField('has_growth_goals', val)}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Year 1 Revenue Target (USD)</Text>
              <TextInput
                style={styles.textInput}
                value={
                  startupDraft.revenue_target_year1 != null
                    ? String(startupDraft.revenue_target_year1)
                    : ''
                }
                onChangeText={(val) => {
                  const n = parseInt(val, 10);
                  setStartupDraftField('revenue_target_year1', isNaN(n) ? undefined : n);
                }}
                placeholder="e.g. 50000"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
          </View>
        </Card>

        <View style={styles.navRow}>
          <Button
            title="Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
            fullWidth={false}
            style={styles.navBtn}
          />
          <Button
            title="Submit"
            onPress={handleSubmit}
            loading={submitting}
            fullWidth={false}
            style={[styles.navBtn, styles.flex1]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  progressWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, gap: 6 },
  progressText: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    textAlign: 'right',
  },
  scroll: { padding: 20, gap: 20, paddingBottom: 48 },
  content: { gap: 16 },
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
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  navBtn: { minWidth: 110 },
  flex1: { flex: 1 },
});
