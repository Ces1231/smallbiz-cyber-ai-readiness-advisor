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
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const TOTAL_STEPS = 9;

export function StartupStep1Screen({ navigation }: any) {
  const { startupDraft, setStartupDraftField } = useDraftStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressWrap}>
        <ProgressBar current={1} total={TOTAL_STEPS} />
        <Text style={styles.progressText}>Step 1 of {TOTAL_STEPS} — Business Idea</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Your Business Idea</Text>
            <Text style={styles.stepDesc}>
              Tell us about the business you are planning to start. This helps us
              personalize your launch readiness assessment.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Idea</Text>
              <TextInput
                style={[styles.textInput, styles.multiline]}
                value={startupDraft.business_idea ?? ''}
                onChangeText={(val) => setStartupDraftField('business_idea', val)}
                placeholder="Describe your business idea..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                returnKeyType="done"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Target Customer</Text>
              <TextInput
                style={styles.textInput}
                value={startupDraft.target_customer ?? ''}
                onChangeText={(val) => setStartupDraftField('target_customer', val)}
                placeholder="Who is your ideal customer?"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
            </View>
          </View>
        </Card>

        <View style={styles.navRow}>
          <Button
            title="Next"
            onPress={() => navigation.navigate('StartupStep2')}
            fullWidth={false}
            style={styles.navBtn}
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
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  navBtn: { minWidth: 110 },
});
