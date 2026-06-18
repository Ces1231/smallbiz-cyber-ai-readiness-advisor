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

export function StartupStep6Screen({ navigation }: any) {
  const { startupDraft, setStartupDraftField } = useDraftStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressWrap}>
        <ProgressBar current={6} total={TOTAL_STEPS} />
        <Text style={styles.progressText}>Step 6 of {TOTAL_STEPS} — Online Presence</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Online Presence</Text>
            <Text style={styles.stepDesc}>
              A visible online presence builds customer trust and is increasingly required
              by lenders verifying your business legitimacy.
            </Text>

            <Toggle
              label="I have a registered domain name"
              value={startupDraft.has_domain ?? false}
              onValueChange={(val) => setStartupDraftField('has_domain', val)}
            />

            <Toggle
              label="I have active social media accounts"
              value={startupDraft.has_social_media ?? false}
              onValueChange={(val) => setStartupDraftField('has_social_media', val)}
            />

            <Toggle
              label="I have a business website"
              value={startupDraft.has_website ?? false}
              onValueChange={(val) => setStartupDraftField('has_website', val)}
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
            onPress={() => navigation.navigate('StartupStep7')}
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
