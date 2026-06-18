import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { listAssessments, AssessmentSummary } from '../api/assessments';
import { ScoreBadge } from '../components/ScoreBadge';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function HistoryScreen({ navigation }: any) {
  const { token } = useAuthStore();
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await listAssessments(token);
      setAssessments(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load assessments. Please try again.');
    }
  }, [token]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.cyan} />;

  return (
    <SafeAreaView style={styles.safe}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={assessments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No assessments yet</Text>
            <Text style={styles.emptyDesc}>Run your first assessment to see your readiness scores here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('AssessmentDetail', { id: item.id })}
          >
            <ScoreBadge score={item.overall_score} size="sm" />
            <View style={styles.info}>
              <Text style={styles.name}>{item.business_name}</Text>
              <Text style={styles.level}>{item.overall_level}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 14 },
  info: { flex: 1 },
  name: { color: colors.text, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  level: { color: colors.cyan, fontSize: typography.sizes.sm, marginTop: 2 },
  date: { color: colors.muted, fontSize: typography.sizes.sm, marginTop: 2 },
  chevron: { color: colors.muted, fontSize: 22 },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  emptyDesc: { color: colors.muted, fontSize: typography.sizes.base, textAlign: 'center', paddingHorizontal: 32 },
  errorBanner: { backgroundColor: 'rgba(251, 113, 133, 0.15)', borderBottomWidth: 1, borderBottomColor: colors.red, paddingHorizontal: 20, paddingVertical: 12 },
  errorText: { color: colors.red, fontSize: typography.sizes.sm, textAlign: 'center' },
});
