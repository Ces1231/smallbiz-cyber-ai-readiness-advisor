import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { listAssessments, AssessmentSummary } from '../api/assessments';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ScoreBadge } from '../components/ScoreBadge';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function HomeScreen({ navigation }: any) {
  const { user, token, pendingRoute, setPendingRoute } = useAuthStore();
  const [lastAssessment, setLastAssessment] = useState<AssessmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Consume pendingRoute set by OnboardingGateScreen and deep-route the user
  useEffect(() => {
    if (pendingRoute) {
      const route = pendingRoute;
      setPendingRoute(null);
      navigation.navigate(route as any);
    }
  }, [pendingRoute]);

  const fetchAssessments = useCallback(() => {
    if (!token) return;
    return listAssessments(token)
      .then((list) => {
        if (list.length > 0) setLastAssessment(list[0]);
        else setLastAssessment(null);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchAssessments()?.finally(() => setLoading(false));
  }, [fetchAssessments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssessments()?.finally(() => setRefreshing(false));
  }, [fetchAssessments]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cyan}
            colors={[colors.cyan]}
          />
        }
      >
        <Card style={styles.welcome}>
          <Text style={styles.greeting}>
            Hello, {user?.business_name ?? user?.email ?? 'there'}
          </Text>
          <Text style={styles.tagline}>
            Know your readiness. Protect your business.
          </Text>
        </Card>

        {loading ? (
          <ActivityIndicator color={colors.cyan} style={{ marginTop: 32 }} />
        ) : lastAssessment ? (
          <Card style={styles.lastScore}>
            <Text style={styles.sectionTitle}>Last Assessment</Text>
            <View style={styles.scoreRow}>
              <ScoreBadge score={lastAssessment.overall_score} size="lg" />
              <View style={styles.scoreInfo}>
                <Text style={styles.businessName}>{lastAssessment.business_name}</Text>
                <Text style={styles.scoreLevel}>{lastAssessment.overall_level}</Text>
                <Text style={styles.date}>
                  {new Date(lastAssessment.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Button
          title="Start New Assessment"
          onPress={() => navigation.navigate('AssessmentForm')}
          style={styles.cta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, gap: 16 },
  welcome: { gap: 6 },
  greeting: { color: colors.text, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  tagline: { color: colors.muted, fontSize: typography.sizes.base },
  lastScore: { gap: 12 },
  sectionTitle: { color: colors.muted, fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreInfo: { flex: 1 },
  businessName: { color: colors.text, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  scoreLevel: { color: colors.cyan, fontSize: typography.sizes.sm },
  date: { color: colors.muted, fontSize: typography.sizes.sm, marginTop: 4 },
  cta: { marginTop: 8 },
});
