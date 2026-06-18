import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useDraftStore } from '../../store/draftStore';
import { Toggle } from '../../components/Toggle';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const TOTAL_STEPS = 9;

export function StartupStep4Screen({ navigation }: any) {
  const { startupDraft, setStartupDraftField } = useDraftStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressWrap}>
        <ProgressBar current={4} total={TOTAL_STEPS} />
        <Text style={styles.progressText}>Step 4 of {TOTAL_STEPS} — Licenses & Permits</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Licenses & Permits</Text>
            <Text style={styles.stepDesc}>
              Most businesses need at least a local business license. Some industries require
              additional permits before you can legally operate.
            </Text>

            <Toggle
              label="I have a general business license"
              value={startupDraft.has_business_license ?? false}
              onValueChange={(val) => setStartupDraftField('has_business_license', val)}
            />

            <Toggle
              label="I have an industry-specific permit"
              value={startupDraft.has_industry_permit ?? false}
              onValueChange={(val) => setStartupDraftField('has_industry_permit', val)}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Industry Type</Text>
              <TextInput
                style={styles.textInput}
                value={startupDraft.industry_type ?? ''}
                onChangeText={(val) => setStartupDraftField('industry_type', val)}
                placeholder="e.g. Food Service, Healthcare, Construction..."
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
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
            title="Next"
            onPress={() => navigation.navigate('StartupStep5')}
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
