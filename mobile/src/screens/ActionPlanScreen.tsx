import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../store/authStore';
import { getAssessment, Assessment } from '../api/assessments';
import { Card } from '../components/Card';
import { ScoreBadge } from '../components/ScoreBadge';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

// Static action items by score threshold
interface ActionItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

function getActionItems(dimension: 'cyber' | 'ai' | 'funding', score: number): ActionItem[] {
  if (dimension === 'cyber') {
    if (score < 40) {
      return [
        {
          title: 'Enable Multi-Factor Authentication',
          description:
            'Immediately enable MFA on all business accounts — email, banking, cloud services. Use an authenticator app (Google Authenticator or Authy) over SMS.',
          priority: 'high',
        },
        {
          title: 'Implement Automated Backups',
          description:
            'Set up daily automated backups using the 3-2-1 rule: 3 copies, 2 different media, 1 offsite or cloud. Test restores monthly.',
          priority: 'high',
        },
        {
          title: 'Conduct Security Awareness Training',
          description:
            'Train all employees on phishing recognition, password hygiene, and incident reporting. Use free resources from CISA or SBA Cybersecurity Hub.',
          priority: 'high',
        },
      ];
    } else if (score < 80) {
      return [
        {
          title: 'Strengthen MFA Coverage',
          description:
            'Extend MFA to all third-party integrations and vendor portals. Consider hardware security keys (YubiKey) for high-privilege accounts.',
          priority: 'medium',
        },
        {
          title: 'Test and Document Backup Recovery',
          description:
            'Schedule quarterly backup restoration drills. Document your recovery time objective (RTO) and recovery point objective (RPO).',
          priority: 'medium',
        },
        {
          title: 'Establish a Security Training Program',
          description:
            'Move from ad-hoc training to a structured quarterly program. Track completion and run simulated phishing exercises.',
          priority: 'medium',
        },
      ];
    } else {
      return [
        {
          title: 'Pursue Cybersecurity Certification',
          description:
            'Consider CMMC, SOC 2, or NIST CSF certification to demonstrate security maturity to enterprise clients and partners.',
          priority: 'low',
        },
        {
          title: 'Implement Zero-Trust Architecture',
          description:
            'Move toward a zero-trust model with microsegmentation, identity-based access controls, and continuous authentication.',
          priority: 'low',
        },
        {
          title: 'Automate Security Monitoring',
          description:
            'Deploy a SIEM or managed detection and response (MDR) service to continuously monitor for threats and anomalies.',
          priority: 'low',
        },
      ];
    }
  }

  if (dimension === 'ai') {
    if (score < 40) {
      return [
        {
          title: 'Adopt Core Digital Tools',
          description:
            'Start with free-tier tools: Google Workspace for collaboration, QuickBooks for accounting, and a CRM like HubSpot Free to manage customer relationships.',
          priority: 'high',
        },
        {
          title: 'Automate One Repetitive Task',
          description:
            'Identify your most time-consuming manual process and automate it. Use Zapier or Make (formerly Integromat) to connect your existing tools without coding.',
          priority: 'high',
        },
        {
          title: 'Explore AI Productivity Tools',
          description:
            'Try AI writing assistants (Claude, ChatGPT) for drafting emails, marketing copy, and customer responses. Start with free tiers to build familiarity.',
          priority: 'high',
        },
      ];
    } else if (score < 80) {
      return [
        {
          title: 'Deepen Digital Tool Integration',
          description:
            'Connect your existing tools via APIs to eliminate manual data transfer. A unified dashboard reduces errors and saves 5-10 hours per week.',
          priority: 'medium',
        },
        {
          title: 'Build an Automation Workflow Library',
          description:
            'Document and expand your automated workflows. Target customer onboarding, invoicing, and inventory management as high-ROI areas.',
          priority: 'medium',
        },
        {
          title: 'Pilot an AI-Powered Feature',
          description:
            'Deploy an AI chatbot for customer support or use AI for demand forecasting. Measure ROI before scaling.',
          priority: 'medium',
        },
      ];
    } else {
      return [
        {
          title: 'Build a Custom AI Integration',
          description:
            'Use the Claude or OpenAI API to build a custom AI feature tailored to your business — product recommendations, document processing, or predictive analytics.',
          priority: 'low',
        },
        {
          title: 'Establish an AI Governance Policy',
          description:
            'Document how your business uses AI, data handling policies, bias checks, and employee guidelines for AI-generated content.',
          priority: 'low',
        },
        {
          title: 'Lead AI Adoption in Your Industry',
          description:
            'Share your AI success story through industry associations, speaking opportunities, or case studies to build brand authority.',
          priority: 'low',
        },
      ];
    }
  }

  // funding
  if (score < 40) {
    return [
      {
        title: 'Organize Financial Documents',
        description:
          'Compile 3 years of tax returns, profit & loss statements, balance sheets, and bank statements. Use a cloud folder (Google Drive, Dropbox) for easy sharing.',
        priority: 'high',
      },
      {
        title: 'Build Your Online Presence',
        description:
          'Create or update your Google Business Profile, LinkedIn company page, and a basic website. Lenders use online presence to verify legitimacy.',
        priority: 'high',
      },
      {
        title: 'Write a One-Page Growth Plan',
        description:
          'Draft a simple growth plan covering your target market, revenue model, competitive advantage, and 12-month projections. Use the SBA business plan template.',
        priority: 'high',
      },
    ];
  } else if (score < 80) {
    return [
      {
        title: 'Develop a Comprehensive Financial Package',
        description:
          'Prepare a lender-ready package: audited financials, cash flow projections (3 years), accounts receivable aging, and debt schedule.',
        priority: 'medium',
      },
      {
        title: 'Strengthen Your Digital Footprint',
        description:
          'Collect and showcase customer reviews, publish thought leadership content, and ensure your website includes social proof and contact information.',
        priority: 'medium',
      },
      {
        title: 'Create a Formal Business Plan',
        description:
          'Expand your growth plan into a full business plan with market analysis, competitive landscape, management team bios, and financial projections.',
        priority: 'medium',
      },
    ];
  } else {
    return [
      {
        title: 'Pursue Institutional Funding',
        description:
          'You are well-positioned for SBA loans, CDFI lending, or institutional investors. Connect with your local SBDC to identify the best funding match.',
        priority: 'low',
      },
      {
        title: 'Establish a Capital Strategy',
        description:
          'Build a 3-5 year capital plan that sequences funding rounds — bootstrapping, debt, equity — aligned to your growth milestones.',
        priority: 'low',
      },
      {
        title: 'Apply for Business Awards and Recognition',
        description:
          'Apply for small business awards through your chamber of commerce, SBA district, or industry associations to build credibility with lenders.',
        priority: 'low',
      },
    ];
  }
}

function priorityColor(priority: ActionItem['priority']): string {
  if (priority === 'high') return colors.red;
  if (priority === 'medium') return colors.yellow;
  return colors.green;
}

function priorityLabel(priority: ActionItem['priority']): string {
  if (priority === 'high') return 'High Priority';
  if (priority === 'medium') return 'Medium Priority';
  return 'Optimization';
}

interface ActionSectionProps {
  title: string;
  score: number;
  dimension: 'cyber' | 'ai' | 'funding';
}

function ActionSection({ title, score, dimension }: ActionSectionProps) {
  const items = getActionItems(dimension, score);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <ScoreBadge score={score} size="sm" />
      </View>
      {items.map((item, i) => (
        <Card key={i} style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Text style={styles.actionTitle}>{item.title}</Text>
            <View
              style={[
                styles.priorityBadge,
                { borderColor: priorityColor(item.priority), backgroundColor: `${priorityColor(item.priority)}20` },
              ]}
            >
              <Text style={[styles.priorityText, { color: priorityColor(item.priority) }]}>
                {priorityLabel(item.priority)}
              </Text>
            </View>
          </View>
          <Text style={styles.actionDesc}>{item.description}</Text>
        </Card>
      ))}
    </View>
  );
}

function buildPdfHtml(assessment: Assessment): string {
  const cyberItems = getActionItems('cyber', assessment.cyber_score);
  const aiItems = getActionItems('ai', assessment.ai_score);
  const fundingItems = getActionItems('funding', assessment.funding_score);

  function renderItems(items: ActionItem[]): string {
    return items
      .map(
        (item) =>
          `<li style="margin-bottom:12px;"><strong>${item.title}</strong><br/><span style="color:#555;">${item.description}</span></li>`
      )
      .join('');
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>Action Plan — ${assessment.business_name}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;max-width:700px;margin:0 auto;padding:32px;color:#111;background:#fff;">
  <h1 style="font-size:24px;margin-bottom:4px;">${assessment.business_name}</h1>
  <p style="color:#555;font-size:14px;margin-top:0;">Industry: ${assessment.industry} &bull; Date: ${new Date(assessment.created_at).toLocaleDateString()}</p>

  <table style="width:100%;border-collapse:collapse;margin:24px 0;">
    <tr style="background:#f4f4f4;">
      <th style="padding:10px;text-align:left;border:1px solid #ddd;">Dimension</th>
      <th style="padding:10px;text-align:center;border:1px solid #ddd;">Score</th>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #ddd;">Cybersecurity</td>
      <td style="padding:10px;text-align:center;border:1px solid #ddd;font-weight:bold;">${assessment.cyber_score}/100</td>
    </tr>
    <tr style="background:#f9f9f9;">
      <td style="padding:10px;border:1px solid #ddd;">AI &amp; Digital</td>
      <td style="padding:10px;text-align:center;border:1px solid #ddd;font-weight:bold;">${assessment.ai_score}/100</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #ddd;">Funding Readiness</td>
      <td style="padding:10px;text-align:center;border:1px solid #ddd;font-weight:bold;">${assessment.funding_score}/100</td>
    </tr>
  </table>

  <h2 style="font-size:18px;border-bottom:2px solid #e0e0e0;padding-bottom:8px;">Cybersecurity Actions</h2>
  <ul style="padding-left:20px;">${renderItems(cyberItems)}</ul>

  <h2 style="font-size:18px;border-bottom:2px solid #e0e0e0;padding-bottom:8px;">AI &amp; Digital Actions</h2>
  <ul style="padding-left:20px;">${renderItems(aiItems)}</ul>

  <h2 style="font-size:18px;border-bottom:2px solid #e0e0e0;padding-bottom:8px;">Funding Readiness Actions</h2>
  <ul style="padding-left:20px;">${renderItems(fundingItems)}</ul>

  <p style="color:#aaa;font-size:11px;margin-top:40px;border-top:1px solid #ddd;padding-top:12px;">
    Generated by SmallBiz Advisor &mdash; Champtron Systems LLC
  </p>
</body>
</html>`;
}

export function ActionPlanScreen({ navigation, route }: any) {
  const { assessmentId } = route.params as { assessmentId: string };
  const { token, isPaid } = useAuthStore();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Guard: redirect to Upgrade if not paid
  useEffect(() => {
    if (!isPaid) {
      navigation.replace('Upgrade');
    }
  }, [isPaid]);

  useEffect(() => {
    if (!token || !isPaid) return;
    getAssessment(assessmentId, token)
      .then((data) => setAssessment(data))
      .catch((err) => setError(err?.message ?? 'Failed to load assessment.'))
      .finally(() => setLoading(false));
  }, [assessmentId, token, isPaid]);

  const handleExportPdf = async () => {
    if (!assessment) return;
    setExporting(true);
    try {
      const html = buildPdfHtml(assessment);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Action Plan — ${assessment.business_name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `PDF saved to: ${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message ?? 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  };

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
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error ?? 'Assessment not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSide}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Action Plan</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Business summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.businessName}>{assessment.business_name}</Text>
          <Text style={styles.industryText}>{assessment.industry}</Text>
          <Text style={styles.dateText}>
            {new Date(assessment.created_at).toLocaleDateString()}
          </Text>
        </Card>

        <ActionSection
          title="Cybersecurity Actions"
          score={assessment.cyber_score}
          dimension="cyber"
        />
        <ActionSection
          title="AI & Digital Actions"
          score={assessment.ai_score}
          dimension="ai"
        />
        <ActionSection
          title="Funding Readiness Actions"
          score={assessment.funding_score}
          dimension="funding"
        />

        {/* PDF Export */}
        <Button
          title="Save as PDF"
          variant="secondary"
          onPress={handleExportPdf}
          loading={exporting}
          style={styles.exportBtn}
        />
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
  scroll: { padding: 20, gap: 24, paddingBottom: 48 },
  summaryCard: { gap: 4 },
  businessName: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  industryText: { color: colors.cyan, fontSize: typography.sizes.sm },
  dateText: { color: colors.muted, fontSize: typography.sizes.sm },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  actionCard: { gap: 8 },
  actionHeader: { gap: 6 },
  actionTitle: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  priorityText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  actionDesc: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.6,
  },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { color: colors.red, fontSize: typography.sizes.base, textAlign: 'center' },
  exportBtn: { marginTop: 8 },
});
