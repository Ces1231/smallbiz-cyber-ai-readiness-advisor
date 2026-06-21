import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { getLaunchPlan, generatePdf, LaunchPlan, SavedIdeaData } from '../../api/business';
import { colors } from '../../theme/colors';

const FREE_CHECKLIST = [
  'Choose a business name',
  'Register your domain',
  'Open a business bank account',
  'Set up a basic website or social media page',
  'Tell your first 10 potential customers',
];

export function DreamBuilderPlanScreen({ navigation, route }: any) {
  const { token } = useAuthStore();
  const { businessIdeaId, savedIdea, tier } = route.params as {
    businessIdeaId: string;
    savedIdea: SavedIdeaData;
    tier: string;
  };

  const [planData, setPlanData] = useState<LaunchPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (tier !== 'preview') {
      loadPlan(tier);
    }
  }, []);

  async function loadPlan(t: string) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const plan = await getLaunchPlan(token, businessIdeaId, t);
      setPlanData(plan);
    } catch (e: any) {
      if (e?.status === 402) {
        setShowUpgrade(true);
      } else {
        setError(e?.message ?? 'Failed to load plan.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!token) return;
    setPdfLoading(true);
    try {
      const result = await generatePdf(token, businessIdeaId);
      await Linking.openURL(result.pdf_url);
    } catch (e: any) {
      setError('PDF generation failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  }

  function navigateToUpgrade(productKey: string) {
    navigation.navigate('DreamBuilderUpgrade', {
      businessIdeaId,
      productKey,
    });
  }

  function renderIdeaSummary() {
    return (
      <View style={styles.ideaSummary}>
        <Text style={styles.ideaName}>{savedIdea.idea_name}</Text>
        <Text style={styles.ideaDesc}>{savedIdea.idea_description}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.badge, styles.fitBadge]}>
            <Text style={[styles.badgeText, styles.fitBadgeText]}>Fit: {savedIdea.business_fit_pct}%</Text>
          </View>
          <View style={styles.badge}><Text style={styles.badgeText}>Cost: {savedIdea.startup_cost_tier}</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>Difficulty: {savedIdea.difficulty_tier}</Text></View>
        </View>
      </View>
    );
  }

  function renderPreview() {
    return (
      <>
        {renderIdeaSummary()}
        {/* Mission preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mission Preview</Text>
          <Text style={styles.missionText}>{savedIdea.mission_preview}</Text>
        </View>
        {/* Free checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Starter Checklist</Text>
          {FREE_CHECKLIST.map((item, i) => (
            <View key={i} style={styles.checkRow}>
              <Text style={styles.checkMark}>✓</Text>
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
          {/* Locked items */}
          <View style={styles.lockedRow}><Text style={styles.lockIcon}>🔒</Text><Text style={styles.lockText}>Full legal & setup checklist (20+ items)</Text></View>
          <View style={styles.lockedRow}><Text style={styles.lockIcon}>🔒</Text><Text style={styles.lockText}>Itemized startup cost calculator</Text></View>
          <View style={styles.lockedRow}><Text style={styles.lockIcon}>🔒</Text><Text style={styles.lockText}>3 pricing packages + revenue projections</Text></View>
        </View>
        {/* Roadmap preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Launch Roadmap</Text>
          <View style={styles.phaseCard}>
            <Text style={styles.phaseLabel}>Phase 1: Foundation</Text>
            <Text style={styles.phaseText}>Set up your business identity, register your name, open accounts, and tell your first customers.</Text>
          </View>
          <View style={styles.lockedRow}><Text style={styles.lockIcon}>🔒</Text><Text style={styles.lockText}>Phase 2: First Sales</Text></View>
          <View style={styles.lockedRow}><Text style={styles.lockIcon}>🔒</Text><Text style={styles.lockText}>Phase 3: Growth</Text></View>
          <View style={styles.lockedRow}><Text style={styles.lockIcon}>🔒</Text><Text style={styles.lockText}>Phase 4: Scale</Text></View>
        </View>
        {/* Upgrade CTAs */}
        <View style={styles.upgradeCta}>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigateToUpgrade('launch_builder')}>
            <Text style={styles.ctaBtnText}>Unlock Full Launch Builder — $19</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnSecondary]} onPress={() => navigateToUpgrade('launch_packet_pro')}>
            <Text style={styles.ctaBtnSecondaryText}>Unlock Launch Packet Pro — $49</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  function renderFullPlan() {
    if (!planData) return null;
    const isProTier = tier === 'launch_packet_pro';
    return (
      <>
        {renderIdeaSummary()}
        {/* Checklist */}
        {planData.checklist && planData.checklist.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Full Launch Checklist</Text>
            {planData.checklist.map((item, i) => (
              <View key={i} style={styles.checkRow}>
                <Text style={styles.checkMark}>☐</Text>
                <Text style={styles.checkText}>{item.item} <Text style={styles.categoryText}>({item.category})</Text></Text>
              </View>
            ))}
          </View>
        )}
        {/* Cost Calculator */}
        {planData.cost_calculator && planData.cost_calculator.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Startup Cost Estimate</Text>
            {planData.cost_calculator.map((item, i) => (
              <View key={i} style={styles.costRow}>
                <Text style={styles.costItem}>{item.item}</Text>
                <Text style={styles.costRange}>${item.estimated_cost_low}–${item.estimated_cost_high}</Text>
              </View>
            ))}
          </View>
        )}
        {/* Pricing Packages */}
        {planData.pricing_packages && planData.pricing_packages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Packages</Text>
            {planData.pricing_packages.map((pkg, i) => (
              <View key={i} style={styles.pricingCard}>
                <Text style={styles.pricingName}>{pkg.name}</Text>
                <Text style={styles.pricingPrice}>{pkg.price_suggestion}</Text>
                <Text style={styles.pricingDesc}>{pkg.description}</Text>
              </View>
            ))}
          </View>
        )}
        {/* 30-Day Plan */}
        {planData.thirty_day_plan && planData.thirty_day_plan.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>30-Day Launch Plan</Text>
            {planData.thirty_day_plan.map((week, i) => (
              <View key={i} style={styles.phaseCard}>
                <Text style={styles.phaseLabel}>Week {week.week}: {week.title}</Text>
                {week.milestones.map((m, j) => (
                  <Text key={j} style={styles.milestoneText}>• {m}</Text>
                ))}
              </View>
            ))}
          </View>
        )}
        {/* Pro-only content */}
        {isProTier && planData.mission_vision && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mission & Vision</Text>
            <Text style={styles.bodyText}>{planData.mission_vision}</Text>
          </View>
        )}
        {isProTier && planData.business_plan_text && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Plan</Text>
            <Text style={styles.bodyText}>{planData.business_plan_text}</Text>
          </View>
        )}
        {isProTier && planData.ninety_day_roadmap && planData.ninety_day_roadmap.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>90-Day Roadmap</Text>
            {planData.ninety_day_roadmap.map((month, i) => (
              <View key={i} style={styles.phaseCard}>
                <Text style={styles.phaseLabel}>Month {month.month}: {month.title}</Text>
                {month.goals.map((g, j) => (
                  <Text key={j} style={styles.milestoneText}>• {g}</Text>
                ))}
              </View>
            ))}
          </View>
        )}
        {/* PDF download (Pro only) */}
        {isProTier && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.ctaBtn, pdfLoading ? styles.ctaBtnDisabled : null]}
              onPress={handleDownloadPdf}
              disabled={pdfLoading}
            >
              {pdfLoading ? (
                <ActivityIndicator color="#07111f" />
              ) : (
                <Text style={styles.ctaBtnText}>Download Business Plan PDF</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        {/* Upgrade to Pro (if on builder tier) */}
        {!isProTier && (
          <View style={styles.upgradeCta}>
            <Text style={styles.upgradePrompt}>Ready for the full business plan, persona, 90-day roadmap, and PDF?</Text>
            <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnSecondary]} onPress={() => navigateToUpgrade('launch_packet_pro')}>
              <Text style={styles.ctaBtnSecondaryText}>Upgrade to Launch Packet Pro — $49</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {tier === 'preview' ? 'Your Launch Plan' : tier === 'launch_packet_pro' ? 'Launch Packet Pro' : 'Full Launch Plan'}
        </Text>
      </View>
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>Generating your personalized plan...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : showUpgrade ? (
        <View style={styles.loadingBox}>
          <Text style={styles.upgradeTitle}>Purchase Required</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigateToUpgrade(tier)}>
            <Text style={styles.ctaBtnText}>Unlock {tier === 'launch_packet_pro' ? 'Launch Packet Pro — $49' : 'Launch Builder — $19'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {tier === 'preview' ? renderPreview() : renderFullPlan()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: colors.muted, marginTop: 12, fontSize: 14 },
  errorText: { color: colors.red, fontSize: 14, textAlign: 'center' },
  ideaSummary: {
    backgroundColor: colors.panel, borderRadius: 12,
    borderWidth: 1, borderColor: colors.cyan,
    padding: 16, marginBottom: 20,
  },
  ideaName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  ideaDesc: { fontSize: 13, color: colors.muted, marginBottom: 10, lineHeight: 19 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)',
    backgroundColor: 'rgba(96,165,250,0.08)',
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.blue },
  fitBadge: { borderColor: 'rgba(52,211,153,0.2)', backgroundColor: 'rgba(52,211,153,0.08)' },
  fitBadgeText: { color: colors.green },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  missionText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  checkMark: { color: colors.cyan, fontSize: 15, marginTop: 1 },
  checkText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  categoryText: { color: colors.muted, fontSize: 12 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, opacity: 0.6 },
  lockIcon: { fontSize: 13 },
  lockText: { fontSize: 13, color: colors.muted },
  phaseCard: {
    backgroundColor: colors.panel, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 8,
  },
  phaseLabel: { fontSize: 14, fontWeight: '700', color: colors.cyan, marginBottom: 6 },
  phaseText: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  milestoneText: { fontSize: 13, color: colors.muted, lineHeight: 20, marginLeft: 4 },
  bodyText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  costItem: { flex: 1, fontSize: 13, color: colors.text },
  costRange: { fontSize: 13, color: colors.cyan, fontWeight: '600' },
  pricingCard: {
    backgroundColor: colors.panel, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 8,
  },
  pricingName: { fontSize: 14, fontWeight: '700', color: colors.text },
  pricingPrice: { fontSize: 16, fontWeight: '700', color: colors.cyan, marginTop: 2 },
  pricingDesc: { fontSize: 13, color: colors.muted, marginTop: 4 },
  upgradeCta: {
    backgroundColor: 'rgba(34,211,238,0.04)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.15)',
    borderRadius: 12, padding: 20, marginTop: 8,
  },
  upgradeTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' },
  upgradePrompt: { fontSize: 13, color: colors.muted, marginBottom: 12 },
  ctaBtn: {
    backgroundColor: colors.cyan, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginBottom: 8,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { color: '#07111f', fontWeight: '700', fontSize: 15 },
  ctaBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.cyan,
  },
  ctaBtnSecondaryText: { color: colors.cyan, fontWeight: '700', fontSize: 15 },
});
