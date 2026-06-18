import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useDraftStore } from '../../store/draftStore';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const TOTAL_STEPS = 9;

const FORMATION_TYPES = ['', 'LLC', 'Sole Prop', 'Corporation', 'Partnership'] as const;

export function StartupStep3Screen({ navigation }: any) {
  const { startupDraft, setStartupDraftField } = useDraftStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressWrap}>
        <ProgressBar current={3} total={TOTAL_STEPS} />
        <Text style={styles.progressText}>Step 3 of {TOTAL_STEPS} — Business Formation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Business Formation</Text>
            <Text style={styles.stepDesc}>
              Your business structure affects taxes, liability, and funding options. Choose the
              entity type that fits your goals.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Entity Type</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={startupDraft.formation_type ?? ''}
                  onValueChange={(val) =>
                    setStartupDraftField('formation_type', val || undefined)
                  }
                  style={styles.picker}
                  dropdownIconColor={colors.cyan}
                >
                  <Picker.Item label="Select entity type..." value="" color={colors.muted} />
                  {FORMATION_TYPES.filter(Boolean).map((t) => (
                    <Picker.Item key={t} label={t} value={t} color={colors.text} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>State of Formation</Text>
              <TextInput
                style={styles.textInput}
                value={startupDraft.state_of_formation ?? ''}
                onChangeText={(val) => setStartupDraftField('state_of_formation', val)}
                placeholder="e.g. Georgia, Texas..."
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
            onPress={() => navigation.navigate('StartupStep4')}
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
