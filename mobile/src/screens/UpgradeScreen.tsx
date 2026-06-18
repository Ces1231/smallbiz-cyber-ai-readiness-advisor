import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface FeatureRowProps {
  label: string;
  free: boolean | string;
  pro: boolean | string;
}

function FeatureRow({ label, free, pro }: FeatureRowProps) {
  const freeText = typeof free === 'boolean' ? (free ? '✓' : '✗') : free;
  const proText = typeof pro === 'boolean' ? (pro ? '✓' : '✗') : pro;
  const freeColor = typeof free === 'boolean' ? (free ? colors.green : colors.muted) : colors.muted;
  const proColor = typeof pro === 'boolean' ? (pro ? colors.green : colors.muted) : colors.cyan;

  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={[styles.featureCell, { color: freeColor }]}>{freeText}</Text>
      <Text style={[styles.featureCell, { color: proColor }]}>{proText}</Text>
    </View>
  );
}

export function UpgradeScreen({ navigation }: any) {
  const handleUpgrade = () => {
    Alert.alert(
      'Coming Soon',
      'Billing is coming soon! We\'re setting up secure payment processing.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSide}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade to Pro</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroHeadline}>Unlock Your Full Readiness Report</Text>
          <Text style={styles.heroDesc}>
            Get actionable insights, AI-powered advice, and export-ready reports to protect and grow
            your business.
          </Text>
        </Card>

        {/* Plan comparison */}
        <Card style={styles.tableCard}>
          {/* Table header */}
          <View style={[styles.featureRow, styles.tableHeader]}>
            <Text style={[styles.featureLabel, styles.featureLabelHeader]}>Feature</Text>
            <Text style={styles.planLabel}>Free</Text>
            <Text style={[styles.planLabel, styles.proPlanLabel]}>Pro</Text>
          </View>

          <View style={styles.divider} />

          <FeatureRow label="Assessments / month" free="3" pro="Unlimited" />
          <FeatureRow label="Score view" free pro />
          <FeatureRow label="AI advisor" free={false} pro />
          <FeatureRow label="Full action plan" free={false} pro />
          <FeatureRow label="PDF export" free={false} pro />
          <FeatureRow label="Priority support" free={false} pro />
        </Card>

        {/* Pricing */}
        <Card style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <Text style={styles.price}>$9.99</Text>
            <Text style={styles.perMonth}>/month</Text>
          </View>
          <Text style={styles.pricingNote}>Cancel anytime. No hidden fees.</Text>

          <Button
            title="Upgrade to Pro — $9.99/mo"
            onPress={handleUpgrade}
            variant="paid"
            style={styles.upgradeBtn}
          />

          <Text style={styles.disclaimer}>
            Secure payment processing. Billed monthly.
          </Text>
        </Card>

        {/* Trust badges */}
        <View style={styles.trustRow}>
          <Text style={styles.trustItem}>🔒 Secure checkout</Text>
          <Text style={styles.trustItem}>↩ Cancel anytime</Text>
          <Text style={styles.trustItem}>⭐ 30-day guarantee</Text>
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
  scroll: { padding: 20, gap: 16, paddingBottom: 48 },
  heroCard: { gap: 10, alignItems: 'center' },
  heroHeadline: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  heroDesc: {
    color: colors.muted,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: typography.sizes.base * 1.6,
  },
  tableCard: { gap: 0 },
  tableHeader: { marginBottom: 4 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: typography.sizes.sm,
  },
  featureLabelHeader: {
    color: colors.text,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  featureCell: {
    width: 72,
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  planLabel: {
    width: 72,
    textAlign: 'center',
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  proPlanLabel: { color: colors.green },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  pricingCard: { alignItems: 'center', gap: 10 },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    color: colors.green,
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
  },
  perMonth: {
    color: colors.muted,
    fontSize: typography.sizes.lg,
    marginBottom: 6,
  },
  pricingNote: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
  },
  upgradeBtn: { alignSelf: 'stretch', marginTop: 6 },
  disclaimer: {
    color: colors.muted,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  trustItem: {
    color: colors.muted,
    fontSize: typography.sizes.xs,
  },
});
