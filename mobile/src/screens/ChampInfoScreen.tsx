import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

// Content is hard-coded — do not fetch
const COMPANY = {
  name: 'Champtron Systems LLC',
  tagline: 'Advanced IT Solutions for Modern Businesses',
  location: 'Sanford, FL',
  about:
    'Local IT solutions provider specializing in automation, networking, infrastructure as code, and AI technologies to help businesses optimize operations. Security-first mindset.',
  phone: '(810) 407-0773',
  email: 'info@champtron-systems.com',
  hours: 'Mon–Fri 8AM–6PM  |  Sat 9AM–2PM',
  website: 'https://www.champtron-systems.com',
  contactUrl: 'https://www.champtron-systems.com/#contact',
  services: [
    'IT Automation',
    'Network Solutions',
    'Infrastructure as Code',
    'Zero Trust Security',
    'AI Solutions',
    'Data Management',
    'Cybersecurity',
    'Custom Application Development',
    'Website Development',
  ],
  valueProps: [
    { icon: '⚡', label: 'Same-Day Response' },
    { icon: '📍', label: 'Truly Local (Central Florida)' },
    { icon: '🔒', label: 'Security-First' },
    { icon: '💰', label: 'Transparent Pricing' },
    { icon: '✅', label: '99.9% Uptime' },
  ],
};

export function ChampInfoScreen({ navigation }: any) {
  function openUrl(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  function tapCall() {
    Linking.openURL(`tel:${COMPANY.phone.replace(/\D/g, '')}`).catch(() => {});
  }

  function tapEmail() {
    Linking.openURL(`mailto:${COMPANY.email}`).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>{COMPANY.name}</Text>
          <Text style={styles.tagline}>{COMPANY.tagline}</Text>
          <Text style={styles.location}>{COMPANY.location}</Text>
        </View>

        {/* About */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About Us</Text>
          <Text style={styles.body}>{COMPANY.about}</Text>
        </Card>

        {/* Services */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <View style={styles.serviceGrid}>
            {COMPANY.services.map((s) => (
              <View key={s} style={styles.servicePill}>
                <Text style={styles.serviceText}>{s}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Value Props */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Us</Text>
          {COMPANY.valueProps.map((vp) => (
            <View key={vp.label} style={styles.valueRow}>
              <Text style={styles.valueIcon}>{vp.icon}</Text>
              <Text style={styles.valueLabel}>{vp.label}</Text>
            </View>
          ))}
        </Card>

        {/* Contact */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <TouchableOpacity onPress={tapCall} style={styles.contactRow}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactLink}>{COMPANY.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={tapEmail} style={styles.contactRow}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactLink}>{COMPANY.email}</Text>
          </TouchableOpacity>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Hours</Text>
            <Text style={styles.contactValue}>{COMPANY.hours}</Text>
          </View>
        </Card>

        {/* CTA */}
        <Button
          title="Book a Free Consultation"
          onPress={() => openUrl(COMPANY.contactUrl)}
          style={styles.cta}
        />
        <Button
          title="Visit Our Website"
          variant="secondary"
          onPress={() => openUrl(COMPANY.website)}
          style={styles.ctaSecondary}
        />

        {/* Back to Home */}
        <Button
          title="Go to Home"
          variant="ghost"
          onPress={() => navigation.navigate('Tabs')}
          style={styles.homeBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 48, gap: 16 },

  header: { alignItems: 'center', paddingVertical: 24 },
  brand: {
    color: colors.cyan,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    marginBottom: 4,
  },
  location: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
  },

  section: { gap: 12 },
  sectionTitle: {
    color: colors.muted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
  },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  servicePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  serviceText: {
    color: colors.cyan,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },

  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  valueIcon: { fontSize: 18 },
  valueLabel: { color: colors.text, fontSize: typography.sizes.sm },

  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabel: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  contactLink: {
    color: colors.cyan,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textDecorationLine: 'underline',
  },
  contactValue: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },

  cta: { marginTop: 8 },
  ctaSecondary: { marginTop: 8 },
  homeBtn: { marginTop: 4, marginBottom: 16 },
});
