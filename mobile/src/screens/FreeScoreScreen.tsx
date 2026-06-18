import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Assessment } from '../api/assessments';
import { ScoreBadge } from '../components/ScoreBadge';
import { RiskBadge } from '../components/RiskBadge';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface DimensionCardProps {
  title: string;
  score: number;
  level: string;
  risk: 'Low' | 'Moderate' | 'High';
  isPaid: boolean;
}

const LOCKED_ITEMS = [
  'Detailed security hardening checklist',
  'Step-by-step implementation guide',
  'Priority action timeline with milestones',
];

function normalizeRisk(risk: string): 'Low' | 'Moderate' | 'High' {
  if (risk === 'Medium') return 'Moderate';
  if (risk === 'Low' || risk === 'High' || risk === 'Moderate') return risk;
  return 'High';
}

function DimensionCard({ title, score, level, risk, isPaid }: DimensionCardProps) {
  const normalizedRisk = normalizeRisk(risk);
  return (
    <Card style={styles.dimCard}>
      <View style={styles.dimHeader}>
        <Text style={styles.dimTitle}>{title}</Text>
        <ScoreBadge score={score} size="md" />
      </View>
      <View style={styles.dimMeta}>
        <RiskBadge risk={normalizedRisk} />
        <Text style={styles.levelText}>{level}</Text>
      </View>

      <View style={styles.actionItems}>
        <Text style={styles.actionItemsTitle}>
          {isPaid ? 'Action Items' : 'Action Items (Preview)'}
        </Text>
        {LOCKED_ITEMS.map((item, i) => (
          <View key={i} style={styles.lockedRow}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockedText}>{item}</Text>
          </View>
        ))}
        {!isPaid && (
          <Text style={styles.upgradeHint}>Upgrade to unlock full action plan</Text>
        )}
      </View>
    </Card>
  );
}

export function FreeScoreScreen({ navigation, route }: any) {
  const isPaid = useAuthStore((s) => s.isPaid);
  const { assessmentId, assessment } = route.params as {
    assessmentId: string;
    assessment: Assessment;
  };

  const a = assessment;

  const overallRisk = normalizeRisk(
    a.cyber_risk === 'High' || a.ai_risk === 'High' || a.funding_risk === 'High'
      ? 'High'
      : a.cyber_risk === 'Medium' ||
        a.cyber_risk === 'Moderate' ||
        a.ai_risk === 'Medium' ||
        a.ai_risk === 'Moderate' ||
        a.funding_risk === 'Medium' ||
        a.funding_risk === 'Moderate'
      ? 'Moderate'
      : 'Low'
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSide}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Scores</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Overall score hero */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>Overall Readiness</Text>
          <View style={styles.heroRow}>
            <ScoreBadge score={a.overall_score} size="lg" label="Overall" />
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>{a.business_name}</Text>
              <Text style={styles.heroLevel}>{a.overall_level}</Text>
              <RiskBadge risk={overallRisk} />
            </View>
          </View>
        </Card>

        {/* Dimension cards */}
        <DimensionCard
          title="Cybersecurity"
          score={a.cyber_score}
          level={a.cyber_level}
          risk={a.cyber_risk as any}
          isPaid={isPaid}
        />
        <DimensionCard
          title="AI Readiness"
          score={a.ai_score}
          level={a.ai_level}
          risk={a.ai_risk as any}
          isPaid={isPaid}
        />
        <DimensionCard
          title="Funding Readiness"
          score={a.funding_score}
          level={a.funding_level}
          risk={a.funding_risk as any}
          isPaid={isPaid}
        />

        {/* CTA */}
        <View style={styles.ctaSection}>
          {isPaid ? (
            <Button
              title="View Full Action Plan"
              onPress={() => navigation.navigate('ActionPlan', { assessmentId })}
              variant="paid"
            />
          ) : (
            <>
              <Text style={styles.ctaHeadline}>Unlock Your Full Action Plan</Text>
              <Text style={styles.ctaDesc}>
                Get prioritized action items, AI advisor access, and PDF export with Pro.
              </Text>
              <Button
                title="Upgrade for Full Action Plan"
                onPress={() => navigation.navigate('Upgrade')}
                variant="paid"
              />
            </>
          )}
          <Button
            title="Start New Assessment"
            onPress={() => navigation.navigate('AssessmentForm')}
            variant="secondary"
            style={styles.secondaryBtn}
          />
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
  heroCard: { gap: 12 },
  heroLabel: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  heroInfo: { flex: 1, gap: 6 },
  heroTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  heroLevel: { color: colors.cyan, fontSize: typography.sizes.base },
  dimCard: { gap: 12 },
  dimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dimTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  dimMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelText: { color: colors.cyan, fontSize: typography.sizes.sm, flex: 1 },
  actionItems: { gap: 8 },
  actionItemsTitle: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockIcon: { fontSize: 14 },
  lockedText: { color: colors.muted, fontSize: typography.sizes.sm, flex: 1 },
  upgradeHint: {
    color: colors.yellow,
    fontSize: typography.sizes.sm,
    fontStyle: 'italic',
    marginTop: 4,
  },
  ctaSection: { gap: 12, marginTop: 8 },
  ctaHeadline: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  ctaDesc: {
    color: colors.muted,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: typography.sizes.base * 1.5,
  },
  secondaryBtn: { marginTop: 4 },
});
