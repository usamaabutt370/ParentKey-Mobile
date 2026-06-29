import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type InfoTipCardProps = {
  message: string;
};

export function InfoTipCard({ message }: InfoTipCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Feather color={colors.text.brand} name="info" size={18} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      alignItems: 'flex-start',
      backgroundColor: colors.background.accent,
      borderColor: colors.border.default,
      borderLeftColor: colors.brand.teal,
      borderLeftWidth: 3,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
    },
    message: {
      ...typography.caption,
      color: colors.text.secondary,
      flex: 1,
      lineHeight: 20,
    },
  });
}
