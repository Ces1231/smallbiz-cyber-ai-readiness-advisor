import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'StageGate'>;

export function StageGateScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.brand}>Champtron Systems LLC</Text>
          <Text style={styles.title}>SmallBiz Advisor</Text>
          <Text style={styles.question}>What best describes you?</Text>
        </View>

        {/* Option A — Existing Business (Free assessment → optional paid upgrade) */}
        <View style={[styles.card, styles.cardFree]}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>FREE TO START</Text>
          </View>

          <Text style={styles.cardTitle}>
            I have an existing business and want to improve it
          </Text>
          <Text style={styles.cardDesc}>
            Run a free Cyber, AI, and Funding readiness assessment. See your
            scores and where you stand — no cost. When you're ready, unlock your
            personalized action plan with step-by-step fixes and a 30/60/90-day
            roadmap.
          </Text>

          <View style={styles.featureRow}>
            <View style={styles.featurePill}>
              <Text style={styles.featureFree}>✓ Free scores</Text>
            </View>
            <View style={styles.featurePill}>
              <Text style={styles.featureFree}>✓ Risk summary</Text>
            </View>
            <View style={styles.featurePillPaid}>
              <Text style={styles.featurePaidText}>★ Action plan (paid)</Text>
            </View>
          </View>

          <Button
            title="I Have an Existing Business →"
            variant="secondary"
            onPress={() => navigation.navigate('Login', { isStartup: false })}
          />
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Option B — Starting a Business (Paid service) */}
        <View style={[styles.card, styles.cardPaid]}>
          <View style={[styles.badge, styles.badgePaid]}>
            <Text style={[styles.badgeText, styles.badgePaidText]}>PAID SERVICE</Text>
          </View>

          <Text style={styles.cardTitle}>
            I'm looking to start a business and need help with it
          </Text>
          <Text style={styles.cardDesc}>
            A guided 9-step launch readiness assessment covering business
            formation, licensing, budgeting, online presence, and your growth
            plan. Get a personalized launch roadmap and printable action plan.
          </Text>

          <View style={styles.featureRow}>
            <View style={styles.featurePillPaid}>
              <Text style={styles.featurePaidText}>★ Formation guide</Text>
            </View>
            <View style={styles.featurePillPaid}>
              <Text style={styles.featurePaidText}>★ Launch roadmap</Text>
            </View>
            <View style={styles.featurePillPaid}>
              <Text style={styles.featurePaidText}>★ PDF export</Text>
            </View>
          </View>

          <Button
            title="I'm Starting a Business →"
            variant="paid"
            onPress={() => navigation.navigate('Login', { isStartup: true })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 40 },

  header: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
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
    marginBottom: 12,
  },
  question: {
    color: colors.cyan,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
    gap: 14,
  },
  cardFree: {
    backgroundColor: colors.panel,
    borderColor: colors.cyan + '55',
  },
  cardPaid: {
    backgroundColor: colors.panel,
    borderColor: colors.green + '55',
  },

  cardTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    lineHeight: 24,
  },
  cardDesc: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
  },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  badgePaid: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: colors.green,
  },
  badgeText: {
    color: colors.cyan,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
  badgePaidText: { color: colors.green },

  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featurePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  featurePillPaid: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  featureFree: {
    color: colors.cyan,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  featurePaidText: {
    color: colors.green,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
});
