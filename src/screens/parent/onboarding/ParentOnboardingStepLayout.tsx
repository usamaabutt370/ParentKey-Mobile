import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../../context/ThemeContext';
import type { ColorPalette } from '../../../theme/colors';
import { spacing, typography } from '../../../theme';

type Props = {
  children: React.ReactNode;
  currentStep: number;
  icon: string;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  subtitle: string;
  title: string;
  totalSteps: number;
};

export function ParentOnboardingStepLayout({
  children,
  currentStep,
  icon,
  onBack,
  onSkip,
  skipLabel = 'Skip',
  subtitle,
  title,
  totalSteps,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const showTopBar = Boolean(onBack || onSkip);

  return (
    <View style={styles.container}>
      {showTopBar ? (
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onBack}
              style={styles.backButton}>
              <Feather color={colors.text.primary} name="chevron-left" size={24} />
            </Pressable>
          ) : (
            <View style={styles.topBarSpacer} />
          )}

          {onSkip ? (
            <Pressable
              accessibilityLabel={skipLabel}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onSkip}
              style={styles.skipButton}>
              <Text style={styles.skipText}>{skipLabel}</Text>
            </Pressable>
          ) : (
            <View style={styles.topBarSpacer} />
          )}
        </View>
      ) : null}

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
      <Text style={styles.icon}>{icon}</Text>
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
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 32,
    },
    topBarSpacer: {
      width: 48,
    },
    backButton: {
      marginLeft: -spacing.xs,
      padding: spacing.xs,
    },
    skipButton: {
      marginRight: -spacing.xs,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
    },
    skipText: {
      ...typography.label,
      color: colors.text.brand,
      fontSize: 16,
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
