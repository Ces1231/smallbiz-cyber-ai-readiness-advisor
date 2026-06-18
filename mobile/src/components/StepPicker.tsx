import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StepPickerProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  options?: { label: string; value: number }[];
  style?: ViewStyle;
}

const defaultOptions = [
  { label: 'Not implemented (0)', value: 0 },
  { label: 'Partially implemented (1)', value: 1 },
  { label: 'Fully implemented (2)', value: 2 },
];

export function StepPicker({
  label,
  value,
  onChange,
  options = defaultOptions,
  style,
}: StepPickerProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={value}
          onValueChange={(v) => onChange(Number(v))}
          style={styles.picker}
          dropdownIconColor={colors.cyan}
          itemStyle={{ color: colors.text }}
        >
          {options.map((opt) => (
            <Picker.Item
              key={opt.value}
              label={opt.label}
              value={opt.value}
              color={colors.text}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: colors.muted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerWrap: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text,
    backgroundColor: 'transparent',
  },
});
