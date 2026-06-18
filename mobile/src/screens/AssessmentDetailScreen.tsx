import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { getAssessment, Assessment } from '../api/assessments';
import { ScoreBadge } from '../components/ScoreBadge';
import { RiskBadge } from '../components/RiskBadge';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

function normalizeRisk(risk: string): 'Low' | 'Moderate' | 'High' {
  if (risk === 'Medium') return 'Moderate';
  if (risk === 'Low' || risk === 'High' || risk === 'Moderate') return risk;
  return 'High';
}

interface ScoreRowProps {
  label: string;
  score: number;
  level: string;
  risk: string;
}

function ScoreRow({ label, score, level, risk }: ScoreRowProps) {
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreRowInfo}>
        <Text style={styles.scoreRowLabel}>{label}</Text>
        <Text style={styles.scoreRowLevel}>{level}</Text>
        <RiskBadge risk={normalizeRisk(risk)} />
      </View>
      <ScoreBadge score={score} size="md" />
    </View>
  );
}

export function AssessmentDetailScreen({ navigation, route }: any) {
  const { id } = route.params as { id: string };
  const { token, isPaid } = useAuthStore();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getAssessment(id, token)
      .then((data) => setAssessment(data))
      .catch((err) => setError(err?.message ?? 'Failed to load assessment.'))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.cyan} />
      </SafeAreaView>
    );
  }

  if (error || !assessment) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSide}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assessment Detail</Text>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error ?? 'Assessment not found.'}</Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
            style={styles.errorBtn}
            fullWidth={false}
          />
        </View>
      </SafeAreaView>
    );
  }

  const overallRisk = normalizeRisk(
    assessment.cyber_risk === 'High' ||
    assessment.ai_risk === 'High' ||
    assessment.funding_risk === 'High'
      ? 'High'
      : assessment.cyber_risk === 'Medium' ||
        assessment.cyber_risk === 'Moderate' ||
        assessment.ai_risk === 'Medium' ||
        assessment.ai_risk === 'Moderate' ||
        assessment.funding_risk === 'Medium' ||
        assessment.funding_risk === 'Moderate'
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
        <Text style={styles.headerTitle}>Assessment Detail</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Overall hero */}
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <ScoreBadge score={assessment.overall_score} size="lg" label="Score" />
            <View style={styles.heroInfo}>
              <Text style={styles.businessName}>{assessment.business_name}</Text>
              <Text style={styles.industryText}>{assessment.industry}</Text>
              <Text style={styles.overallLevel}>{assessment.overall_level}</Text>
              <RiskBadge risk={overallRisk} />
            </View>
          </View>
          <Text style={styles.dateText}>
            Assessed on {new Date(assessment.created_at).toLocaleDateString()}
          </Text>
        </Card>

        {/* Score breakdown */}
        <Card style={styles.breakdownCard}>
          <Text style={styles.sectionLabel}>Score Breakdown</Text>
          <ScoreRow
            label="Cybersecurity"
            score={assessment.cyber_score}
            level={assessment.cyber_level}
            risk={assessment.cyber_risk}
          />
          <View style={styles.rowDivider} />
          <ScoreRow
            label="AI Readiness"
            score={assessment.ai_score}
            level={assessment.ai_level}
            risk={assessment.ai_risk}
          />
          <View style={styles.rowDivider} />
          <ScoreRow
            label="Funding Readiness"
            score={assessment.funding_score}
            level={assessment.funding_level}
            risk={assessment.funding_risk}
          />
        </Card>

        {/* Action buttons */}
        <View style={styles.actions}>
          {isPaid ? (
            <Button
              title="View Action Plan"
              onPress={() => navigation.navigate('ActionPlan', { assessmentId: assessment.id })}
              variant="paid"
            />
          ) : (
            <Button
              title="Upgrade for Action Plan"
              onPress={() => navigation.navigate('Upgrade')}
              variant="secondary"
            />
          )}
          <Button
            title="Start New Assessment"
            onPress={() => navigation.navigate('AssessmentForm')}
            variant="ghost"
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
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  heroInfo: { flex: 1, gap: 6 },
  businessName: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  industryText: { color: colors.cyan, fontSize: typography.sizes.sm },
  overallLevel: { color: colors.muted, fontSize: typography.sizes.sm },
  dateText: { color: colors.muted, fontSize: typography.sizes.xs },
  breakdownCard: { gap: 12 },
  sectionLabel: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scoreRowInfo: { flex: 1, gap: 4 },
  scoreRowLabel: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  scoreRowLevel: { color: colors.muted, fontSize: typography.sizes.sm },
  rowDivider: { height: 1, backgroundColor: colors.border },
  actions: { gap: 12 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorText: { color: colors.red, fontSize: typography.sizes.base, textAlign: 'center' },
  errorBtn: { minWidth: 120 },
});
