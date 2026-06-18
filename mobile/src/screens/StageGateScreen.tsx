import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Button } from '../components/Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'StageGate'>;

export function StageGateScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>Champtron Systems LLC</Text>
          <Text style={styles.title}>SmallBiz Advisor</Text>
          <Text style={styles.subtitle}>
            Cyber & AI Readiness — Know where you stand
          </Text>
        </View>

        <View style={styles.options}>
          <View style={styles.optionCard}>
            <Text style={styles.optionTitle}>Existing Business</Text>
            <Text style={styles.optionDesc}>
              Get your free Cyber, AI, and Funding readiness scores. Unlock your
              full action plan to grow and protect your business.
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>FREE ASSESSMENT</Text>
            </View>
            <Button
              title="I Have an Existing Business"
              variant="secondary"
              onPress={() => navigation.navigate('Login', { isStartup: false })}
            />
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.optionCard}>
            <Text style={styles.optionTitle}>Starting a Business</Text>
            <Text style={styles.optionDesc}>
              Step-by-step launch readiness assessment. Formation, compliance,
              digital presence, and funding roadmap — all in one place.
            </Text>
            <View style={[styles.badge, styles.paidBadge]}>
              <Text style={[styles.badgeText, { color: colors.green }]}>PAID SERVICE</Text>
            </View>
            <Button
              title="I'm Starting a Business"
              variant="paid"
              onPress={() => navigation.navigate('Login', { isStartup: true })}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  brand: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: 8,
  },
  options: { flex: 1, justifyContent: 'center' },
  optionCard: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  optionTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  optionDesc: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  paidBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: colors.green,
  },
  badgeText: {
    color: colors.cyan,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: typography.sizes.sm },
});
