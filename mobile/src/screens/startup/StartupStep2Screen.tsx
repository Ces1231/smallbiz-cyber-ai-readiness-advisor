import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useDraftStore } from '../../store/draftStore';
import { Toggle } from '../../components/Toggle';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const TOTAL_STEPS = 9;

export function StartupStep2Screen({ navigation }: any) {
  const { startupDraft, setStartupDraftField } = useDraftStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressWrap}>
        <ProgressBar current={2} total={TOTAL_STEPS} />
        <Text style={styles.progressText}>Step 2 of {TOTAL_STEPS} — Budget & Finance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Budget & Finance</Text>
            <Text style={styles.stepDesc}>
              Help us understand your financial starting point so we can tailor your
              funding readiness recommendations.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Startup Budget (USD)</Text>
              <TextInput
                style={styles.textInput}
                value={startupDraft.startup_budget != null ? String(startupDraft.startup_budget) : ''}
                onChangeText={(val) => {
                  const n = parseInt(val, 10);
                  setStartupDraftField('startup_budget', isNaN(n) ? undefined : n);
                }}
                placeholder="e.g. 5000"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Estimated Monthly Expenses (USD)</Text>
              <TextInput
                style={styles.textInput}
                value={startupDraft.monthly_expenses != null ? String(startupDraft.monthly_expenses) : ''}
                onChangeText={(val) => {
                  const n = parseInt(val, 10);
                  setStartupDraftField('monthly_expenses', isNaN(n) ? undefined : n);
                }}
                placeholder="e.g. 1500"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>

            <Toggle
              label="I have a funding source (savings, loan, investor)"
              value={startupDraft.has_funding_source ?? false}
              onValueChange={(val) => setStartupDraftField('has_funding_source', val)}
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
            onPress={() => navigation.navigate('StartupStep3')}
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
