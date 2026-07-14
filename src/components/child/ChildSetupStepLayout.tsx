import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = {
  children: React.ReactNode;
  currentStep: number;
  icon?: string | null;
  subtitle: string;
  title: string;
  totalSteps: number;
};

export function ChildSetupStepLayout({
  children,
  currentStep,
  icon,
  subtitle,
  title,
  totalSteps,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentStep - 1 && styles.progressDotActive,
              index < currentStep - 1 && styles.progressDotDone,
            ]}
          />
        ))}
      </View>

      <Text style={styles.eyebrow}>
        Step {currentStep} of {totalSteps}
      </Text>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: spacing.md,
      justifyContent: 'flex-start',
      paddingTop: spacing.sm,
    },
    progressRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
    },
    progressDot: {
      backgroundColor: colors.border.default,
      borderRadius: 4,
      height: 6,
      width: 24,
    },
    progressDotActive: {
      backgroundColor: colors.brand.teal,
    },
    progressDotDone: {
      backgroundColor: colors.text.brand,
    },
    eyebrow: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '700',
      letterSpacing: 0.5,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    icon: {
      fontSize: 48,
      textAlign: 'center',
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 28,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    body: {
      gap: spacing.md,
      marginTop: spacing.sm,
    },
  });
}
