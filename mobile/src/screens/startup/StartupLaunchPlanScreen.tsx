import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { StartupAssessmentResponse } from '../../api/startup';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ScoreBadge } from '../../components/ScoreBadge';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface ActionItem {
  title: string;
  description: string;
}

function getFormationSteps(assessment: StartupAssessmentResponse): ActionItem[] {
  const steps: ActionItem[] = [];

  if (!assessment.formation_type) {
    steps.push({
      title: 'Choose Your Business Entity',
      description:
        'Select an entity type — LLC is ideal for most small businesses because it limits personal liability while allowing pass-through taxation. Visit your state Secretary of State website to file.',
    });
  }
  if (!assessment.has_ein) {
    steps.push({
      title: 'Apply for an EIN (Free, Takes 5 Minutes)',
      description:
        'Apply for a Federal Employer Identification Number at IRS.gov/EIN. You need this to open a business bank account, hire employees, and file business taxes.',
    });
  }
  if (!assessment.has_business_plan) {
    steps.push({
      title: 'Write a One-Page Business Plan',
      description:
        'Use the SBA Business Plan Tool at SBA.gov to draft your plan. Cover your value proposition, target market, revenue model, and 12-month milestones.',
    });
  }
  if (!assessment.has_bank_account) {
    steps.push({
      title: 'Open a Business Checking Account',
      description:
        'Keep personal and business finances completely separate. Bring your EIN, formation documents, and a deposit to a local credit union or online bank like Mercury.',
    });
  }

  // Always include at least one item
  if (steps.length === 0) {
    steps.push({
      title: 'Review Your Operating Agreement',
      description:
        'Ensure your operating agreement or bylaws are up to date and reflect current ownership structure. Keep a copy in your secure business records.',
    });
    steps.push({
      title: 'Register a Trademark for Your Business Name',
      description:
        'Search USPTO.gov to confirm your business name is available and consider filing a trademark to protect your brand as you grow.',
    });
  }

  return steps.slice(0, 4);
}

function getFinanceSteps(assessment: StartupAssessmentResponse): ActionItem[] {
  const steps: ActionItem[] = [];

  if (!assessment.has_funding_source) {
    steps.push({
      title: 'Identify Your Startup Funding Options',
      description:
        'Explore SBA microloans (up to $50K), CDFI grants, local Small Business Development Center (SBDC) programs, or crowdfunding platforms like Kickstarter. Your local SBDC offers free guidance.',
    });
  }
  if (!assessment.startup_budget) {
    steps.push({
      title: 'Build a 90-Day Startup Budget',
      description:
        'List every startup cost (licenses, equipment, website, marketing) and ongoing monthly expenses. Multiply by 3 for a 90-day runway target. Use a free Google Sheets template.',
    });
  }
  steps.push({
    title: 'Set Up Simple Bookkeeping from Day One',
    description:
      'Use Wave (free) or QuickBooks Simple Start to track income and expenses from your first dollar. Clean books are required for any loan application.',
  });
  steps.push({
    title: 'Build Your Business Credit Profile',
    description:
      'Apply for a business credit card and use it for all business purchases. Pay in full each month. After 6 months you will have a fundable business credit profile.',
  });

  return steps.slice(0, 4);
}

function getDigitalSteps(assessment: StartupAssessmentResponse): ActionItem[] {
  const steps: ActionItem[] = [];

  if (!assessment.has_domain) {
    steps.push({
      title: 'Register Your Domain Name Today',
      description:
        'Use Namecheap or Google Domains to register your business domain. Keep it simple: businessname.com. Cost is under $15/year.',
    });
  }
  if (!assessment.has_website) {
    steps.push({
      title: 'Launch a Professional Website',
      description:
        'Use Squarespace or Wix to build a 3-5 page website in a weekend. Include: Home, About, Services, Contact. Enable SSL (HTTPS) — this is required for Google ranking.',
    });
  }
  if (!assessment.has_social_media) {
    steps.push({
      title: 'Claim Your Social Media Handles',
      description:
        'Reserve your business name on Instagram, Facebook, and LinkedIn — even if you are not ready to post yet. Consistency across platforms builds brand credibility.',
    });
  }
  if ((assessment.digital_tools_planned ?? 0) === 0) {
    steps.push({
      title: 'Choose Your Core Digital Toolkit',
      description:
        'Start with: Google Workspace for email and documents, a free CRM like HubSpot, and a scheduling tool like Calendly. These three tools cover 80% of daily business operations.',
    });
  } else {
    steps.push({
      title: 'Integrate Your Digital Tools',
      description:
        'Connect your tools with Zapier or Make to eliminate manual data entry. Start with a simple automation: new contact form → CRM → welcome email.',
    });
  }

  return steps.slice(0, 4);
}

export function StartupLaunchPlanScreen({ navigation, route }: any) {
  const { isPaid } = useAuthStore();
  const { assessment } = route.params as { assessment: StartupAssessmentResponse };

  // Guard: must be paid
  useEffect(() => {
    if (!isPaid) {
      navigation.replace('Upgrade');
    }
  }, [isPaid]);

  if (!isPaid) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.cyan} />
      </SafeAreaView>
    );
  }

  const formationSteps = getFormationSteps(assessment);
  const financeSteps = getFinanceSteps(assessment);
  const digitalSteps = getDigitalSteps(assessment);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.planTitle}>Launch Plan</Text>
          <Text style={styles.businessIdea} numberOfLines={2}>
            {assessment.business_idea ?? 'Your Startup'}
          </Text>
          <View style={styles.scoresRow}>
            <View style={styles.scoreChip}>
              <Text style={styles.scoreChipLabel}>Formation</Text>
              <Text style={[styles.scoreChipValue, { color: scoreColor(assessment.formation_score) }]}>
                {assessment.formation_score}%
              </Text>
            </View>
            <View style={styles.scoreChip}>
              <Text style={styles.scoreChipLabel}>Finance</Text>
              <Text style={[styles.scoreChipValue, { color: scoreColor(assessment.finance_score) }]}>
                {assessment.finance_score}%
              </Text>
            </View>
            <View style={styles.scoreChip}>
              <Text style={styles.scoreChipLabel}>Digital</Text>
              <Text style={[styles.scoreChipValue, { color: scoreColor(assessment.digital_score) }]}>
                {assessment.digital_score}%
              </Text>
            </View>
          </View>
        </Card>

        {/* Formation section */}
        <PlanSection
          title="Formation Steps"
          accentColor={colors.cyan}
          items={formationSteps}
        />

        {/* Finance section */}
        <PlanSection
          title="Finance Steps"
          accentColor={colors.green}
          items={financeSteps}
        />

        {/* Digital section */}
        <PlanSection
          title="Digital Steps"
          accentColor={colors.blue}
          items={digitalSteps}
        />

        {/* Export */}
        <Button
          title="Print / Export (Coming Soon)"
          variant="secondary"
          onPress={() => Alert.alert('Coming Soon', 'PDF export will be available in the next update.')}
          style={styles.exportBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function scoreColor(score: number): string {
  if (score >= 75) return colors.green;
  if (score >= 50) return colors.yellow;
  return colors.red;
}

interface PlanSectionProps {
  title: string;
  accentColor: string;
  items: ActionItem[];
}

function PlanSection({ title, accentColor, items }: PlanSectionProps) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionBar, { backgroundColor: accentColor }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, i) => (
        <Card key={i} style={styles.actionCard}>
          <View style={styles.actionNumWrap}>
            <Text style={[styles.actionNum, { color: accentColor }]}>{i + 1}</Text>
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>{item.title}</Text>
            <Text style={styles.actionDesc}>{item.description}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 20, paddingBottom: 48 },

  summaryCard: { gap: 12 },
  planTitle: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  businessIdea: {
    color: colors.muted,
    fontSize: typography.sizes.base,
    fontStyle: 'italic',
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  scoreChip: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  scoreChipLabel: {
    color: colors.muted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  scoreChipValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },

  section: { gap: 12 },
  sectionBar: {
    height: 3,
    borderRadius: 2,
    width: 40,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginTop: -4,
  },
  actionCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  actionNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
    marginTop: 2,
  },
  actionNum: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  actionBody: { flex: 1, gap: 6 },
  actionTitle: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  actionDesc: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.6,
  },

  exportBtn: { marginTop: 8 },
});
