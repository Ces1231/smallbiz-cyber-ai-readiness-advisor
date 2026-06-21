import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { saveIdea, IdeaSuggestion } from '../../api/business';
import { colors } from '../../theme/colors';

export function DreamBuilderResultsScreen({ navigation, route }: any) {
  const { token } = useAuthStore();
  const { businessIdeaId, suggestions, missionPreview } = route.params as {
    businessIdeaId: string;
    suggestions: IdeaSuggestion[];
    missionPreview: string;
  };

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveIdea() {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveIdea(token, businessIdeaId, selectedIndex);
      navigation.navigate('DreamBuilderPlan', {
        businessIdeaId,
        savedIdea: saved,
        tier: 'preview',
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save idea.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Business Ideas</Text>
        <Text style={styles.headerSub}>Based on your skills and goals, here are 3 tailored ideas.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {suggestions.map((idea, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.ideaCard, selectedIndex === i ? styles.ideaCardSelected : null]}
            onPress={() => setSelectedIndex(i)}
          >
            <Text style={styles.ideaName}>{idea.name}</Text>
            <Text style={styles.ideaDesc}>{idea.description}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.badge, styles.fitBadge]}>
                <Text style={[styles.badgeText, styles.fitBadgeText]}>Fit: {idea.business_fit_pct}%</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Cost: {idea.startup_cost_tier}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Difficulty: {idea.difficulty_tier}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Revenue: {idea.revenue_potential}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Mission Preview */}
        <View style={styles.missionCard}>
          <Text style={styles.missionTitle}>Your Mission Preview</Text>
          <Text style={styles.missionText}>{missionPreview}</Text>
          <View style={styles.missionBlurred}>
            <Text style={styles.missionBlurText}>
              Your business has a clear and inspiring direction that resonates with your community...
            </Text>
          </View>
          <View style={styles.lockRow}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.lockText}>Full mission statement unlocked with Launch Packet Pro — $49</Text>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving ? styles.saveBtnDisabled : null]}
          onPress={handleSaveIdea}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#07111f" />
          ) : (
            <Text style={styles.saveBtnText}>Save This Idea & See Your Plan</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  ideaCard: {
    backgroundColor: colors.panel, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 10,
  },
  ideaCardSelected: { borderColor: colors.cyan },
  ideaName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  ideaDesc: { fontSize: 13, color: colors.muted, marginBottom: 12, lineHeight: 19 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.2)',
    backgroundColor: 'rgba(96,165,250,0.08)',
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.blue },
  fitBadge: { borderColor: 'rgba(52,211,153,0.2)', backgroundColor: 'rgba(52,211,153,0.08)' },
  fitBadgeText: { color: colors.green },
  missionCard: {
    backgroundColor: colors.panel, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, marginTop: 16,
  },
  missionTitle: { fontSize: 14, fontWeight: '700', color: colors.cyan, marginBottom: 8 },
  missionText: { fontSize: 14, color: colors.text, lineHeight: 22, marginBottom: 8 },
  missionBlurred: { opacity: 0.3 },
  missionBlurText: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  lockIcon: { fontSize: 13 },
  lockText: { fontSize: 12, color: colors.muted, flex: 1 },
  error: { color: colors.red, fontSize: 13, marginTop: 12 },
  footer: {
    padding: 16, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  saveBtn: {
    backgroundColor: colors.cyan, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#07111f', fontWeight: '700', fontSize: 15 },
});
