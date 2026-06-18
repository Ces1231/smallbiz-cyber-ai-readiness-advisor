import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { StartupAssessmentResponse } from '../../api/startup';
import { ScoreBadge } from '../../components/ScoreBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface ScoreBarProps {
  label: string;
  score: number;
}

function ScoreBar({ label, score }: ScoreBarProps) {
  const barColor =
    score >= 75 ? colors.green : score >= 50 ? colors.yellow : colors.red;

  return (
    <View style={styles.scoreBarWrap}>
      <View style={styles.scoreBarHeader}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text style={[styles.scoreBarValue, { color: barColor }]}>{score}%</Text>
      </View>
      <View style={styles.scoreBarTrack}>
        <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

export function StartupScoreScreen({ navigation, route }: any) {
  const { assessment } = route.params as { assessment: StartupAssessmentResponse };
  const scrollRef = useRef<ScrollView>(null);

  const launchScore = assessment.launch_readiness;
  const scoreColor =
    launchScore >= 75 ? colors.green : launchScore >= 50 ? colors.yellow : colors.red;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        {/* Hero score */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>Launch Readiness Score</Text>
          <Text style={styles.tagline}>Your launch readiness score.</Text>

          <View style={styles.heroRow}>
            <View style={[styles.scoreDial, { borderColor: scoreColor }]}>
              <Text style={[styles.dialScore, { color: scoreColor }]}>{launchScore}</Text>
              <Text style={styles.dialPct}>out of 100</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroBusinessIdea} numberOfLines={2}>
                {assessment.business_idea
                  ? `"${assessment.business_idea}"`
                  : 'Your Startup'}
              </Text>
              <Text style={[styles.heroReadinessLabel, { color: scoreColor }]}>
                {launchScore >= 75
                  ? 'Launch Ready'
                  : launchScore >= 50
                  ? 'Nearly Ready'
                  : 'Needs Preparation'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Sub-scores */}
        <Card style={styles.subscoresCard}>
          <Text style={styles.subscoresTitle}>Score Breakdown</Text>
          <ScoreBar label="Formation & Documentation" score={assessment.formation_score} />
          <ScoreBar label="Finance & Funding" score={assessment.finance_score} />
          <ScoreBar label="Digital & Tech Readiness" score={assessment.digital_score} />
        </Card>

        {/* CTA */}
        <Card style={styles.ctaCard}>
          <Text style={styles.ctaHeadline}>Your full launch plan is a paid feature.</Text>
          <Text style={styles.ctaDesc}>
            Unlock your step-by-step Launch Plan with formation, finance, and digital
            action items customized to your responses.
          </Text>
          <Button
            title="Unlock Launch Plan"
            variant="paid"
            onPress={() => Alert.alert('Coming Soon', 'Launch Plan purchase will be available soon.')}
          />
          <Button
            title="See My Scores"
            variant="secondary"
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            style={styles.secondaryBtn}
          />
        </Card>

        {/* Start over */}
        <Button
          title="Start New Assessment"
          variant="ghost"
          onPress={() => navigation.navigate('StartupStep1')}
          style={styles.ghostBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 16, paddingBottom: 48 },

  heroCard: { gap: 12 },
  heroLabel: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagline: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 8,
  },
  scoreDial: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialScore: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
  },
  dialPct: {
    color: colors.muted,
    fontSize: typography.sizes.xs,
  },
  heroInfo: { flex: 1, gap: 6 },
  heroBusinessIdea: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    fontStyle: 'italic',
  },
  heroReadinessLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },

  subscoresCard: { gap: 16 },
  subscoresTitle: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreBarWrap: { gap: 6 },
  scoreBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreBarLabel: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  scoreBarValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  scoreBarTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  ctaCard: { gap: 12 },
  ctaHeadline: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  ctaDesc: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: typography.sizes.sm * 1.6,
  },
  secondaryBtn: { marginTop: 4 },
  ghostBtn: { marginTop: 4 },
});
