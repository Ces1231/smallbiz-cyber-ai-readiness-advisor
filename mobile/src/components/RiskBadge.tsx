import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type RiskLevel = 'Low' | 'Moderate' | 'High';

interface RiskBadgeProps {
  risk: RiskLevel;
}

const riskConfig: Record<RiskLevel, { color: string; bg: string }> = {
  Low: { color: colors.green, bg: 'rgba(52, 211, 153, 0.15)' },
  Moderate: { color: colors.yellow, bg: 'rgba(250, 204, 21, 0.15)' },
  High: { color: colors.red, bg: 'rgba(251, 113, 133, 0.15)' },
};

export function RiskBadge({ risk }: RiskBadgeProps) {
  const cfg = riskConfig[risk];
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{risk} Risk</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
