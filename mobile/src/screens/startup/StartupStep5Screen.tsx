import React from 'react';
import {
  View,
  Text,
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

export function StartupStep5Screen({ navigation }: any) {
  const { startupDraft, setStartupDraftField } = useDraftStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressWrap}>
        <ProgressBar current={5} total={TOTAL_STEPS} />
        <Text style={styles.progressText}>Step 5 of {TOTAL_STEPS} — Documentation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Documentation</Text>
            <Text style={styles.stepDesc}>
              These three items are foundational to operating a legitimate business and
              accessing financing when you need it.
            </Text>

            <Toggle
              label="I have an Employer Identification Number (EIN)"
              value={startupDraft.has_ein ?? false}
              onValueChange={(val) => setStartupDraftField('has_ein', val)}
            />

            <Toggle
              label="I have a written business plan"
              value={startupDraft.has_business_plan ?? false}
              onValueChange={(val) => setStartupDraftField('has_business_plan', val)}
            />

            <Toggle
              label="I have a dedicated business bank account"
              value={startupDraft.has_bank_account ?? false}
              onValueChange={(val) => setStartupDraftField('has_bank_account', val)}
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
            onPress={() => navigation.navigate('StartupStep6')}
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
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  navBtn: { minWidth: 110 },
  flex1: { flex: 1 },
});
