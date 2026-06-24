import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type ScreenHeaderProps = {
  onBack?: () => void;
  stepLabel?: string;
  title: string;
  subtitle?: string;
};

export function ScreenHeader({
  onBack,
  stepLabel,
  title,
  subtitle,
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={styles.backButton}>
          <Feather color={colors.text.primary} name="chevron-left" size={24} />
        </Pressable>
      ) : null}
      {stepLabel ? <Text style={styles.stepLabel}>{stepLabel}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    backButton: {
      alignSelf: 'flex-start',
      marginBottom: spacing.xs,
      marginLeft: -spacing.xs,
    },
    stepLabel: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '600',
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 28,
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
    },
  });
}
