import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): string {
  if (score >= 75) return colors.scoreHigh;
  if (score >= 50) return colors.scoreMed;
  return colors.scoreLow;
}

export function ScoreBadge({ score, label, size = 'md' }: ScoreBadgeProps) {
  const color = getScoreColor(score);
  const numSize = size === 'sm' ? 20 : size === 'lg' ? 48 : 32;
  const labelSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;
  const badgeSize = size === 'sm' ? 48 : size === 'lg' ? 96 : 64;

  return (
    <View style={[styles.container, { width: badgeSize, height: badgeSize, borderColor: color }]}>
      <Text style={[styles.score, { color, fontSize: numSize }]}>{score}</Text>
      {label && (
        <Text style={[styles.label, { fontSize: labelSize }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
  },
  score: {
    fontWeight: typography.weights.bold,
    lineHeight: undefined,
  },
  label: {
    color: colors.muted,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
});
