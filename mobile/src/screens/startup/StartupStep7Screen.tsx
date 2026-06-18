import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useDraftStore } from '../../store/draftStore';
import { StepPicker } from '../../components/StepPicker';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const TOTAL_STEPS = 9;

const READINESS_OPTIONS = [
  { label: 'Not planning to use (0)', value: 0 },
  { label: 'Planning some usage (1)', value: 1 },
  { label: 'Planning full adoption (2)', value: 2 },
];

export function StartupStep7Screen({ navigation }: any) {
  const { startupDraft, setStartupDraftField } = useDraftStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressWrap}>
        <ProgressBar current={7} total={TOTAL_STEPS} />
        <Text style={styles.progressText}>Step 7 of {TOTAL_STEPS} — Tech & AI Readiness</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Tech & AI Readiness</Text>
            <Text style={styles.stepDesc}>
              Businesses that plan for digital tools and automation from day one have a
              stronger competitive advantage. Rate your current intentions.
            </Text>

            <StepPicker
              label="Digital Tools (software, apps, platforms)"
              value={startupDraft.digital_tools_planned ?? 0}
              onChange={(val) => setStartupDraftField('digital_tools_planned', val)}
              options={READINESS_OPTIONS}
            />

            <StepPicker
              label="Process Automation"
              value={startupDraft.automation_planned ?? 0}
              onChange={(val) => setStartupDraftField('automation_planned', val)}
              options={READINESS_OPTIONS}
            />

            <StepPicker
              label="AI Tools & Integration"
              value={startupDraft.ai_usage_planned ?? 0}
              onChange={(val) => setStartupDraftField('ai_usage_planned', val)}
              options={READINESS_OPTIONS}
            />
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
            title="Next"
            onPress={() => navigation.navigate('StartupStep8')}
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
  content: { gap: 8 },
  stepTitle: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  stepDesc: {
    color: colors.muted,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.5,
    marginBottom: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  navBtn: { minWidth: 110 },
  flex1: { flex: 1 },
});
