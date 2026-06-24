import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ColorPalette } from '../theme/colors';
import { spacing, typography } from '../theme';

export function useScreenStyles() {
  const { colors } = useTheme();
  return useMemo(() => createScreenStyles(colors), [colors]);
}

function createScreenStyles(colors: ColorPalette) {
  return StyleSheet.create({
    header: {
      gap: spacing.sm,
    },
    brand: {
      color: colors.text.brand,
      fontSize: 20,
      fontWeight: '700',
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
    },
    formError: {
      color: colors.error,
      fontSize: 14,
      textAlign: 'center',
    },
    footer: {
      gap: spacing.md,
      marginTop: 'auto',
      paddingBottom: spacing.sm,
    },
    footerText: {
      color: colors.text.secondary,
      fontSize: 14,
      textAlign: 'center',
    },
  });
}
