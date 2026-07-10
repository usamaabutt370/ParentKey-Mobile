import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '../AuthButton';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Step = {
  key: 'accessibility' | 'usage';
  icon: string;
  title: string;
  description: string;
  buttonTitle: string;
};

const STEPS: Step[] = [
  {
    key: 'accessibility',
    icon: '🔒',
    title: 'Enable app blocking',
    description:
      "ParentKey needs Accessibility access to show a lock screen over apps your parent has blocked. Android requires you to turn this on yourself in Settings — we'll take you straight there.",
    buttonTitle: 'Continue to Settings',
  },
  {
    key: 'usage',
    icon: '📊',
    title: 'Enable usage tracking',
    description:
      "ParentKey needs Usage access so your parent can see how long each app is used. Android requires you to turn this on yourself in Settings — we'll take you straight there.",
    buttonTitle: 'Continue to Settings',
  },
];

type Props = {
  visible: boolean;
  accessibilityEnabled: boolean;
  usageAccessGranted: boolean;
  usageStatsSupported: boolean;
  onEnableAccessibility: () => void | Promise<void>;
  onEnableUsageAccess: () => void | Promise<void>;
  onDismiss: () => void;
};

export function AndroidPermissionOnboardingModal({
  visible,
  accessibilityEnabled,
  usageAccessGranted,
  usageStatsSupported,
  onEnableAccessibility,
  onEnableUsageAccess,
  onDismiss,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [continuing, setContinuing] = useState(false);

  const steps = usageStatsSupported ? STEPS : STEPS.slice(0, 1);
  const stepIndex = !accessibilityEnabled
    ? 0
    : usageStatsSupported && !usageAccessGranted
      ? 1
      : -1;

  if (stepIndex === -1) {
    return null;
  }

  const step = steps[stepIndex];

  const handleContinue = async () => {
    setContinuing(true);
    try {
      if (step.key === 'accessibility') {
        await onEnableAccessibility();
      } else {
        await onEnableUsageAccess();
      }
    } finally {
      setContinuing(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.progressRow}>
            {steps.map((s, index) => (
              <View
                key={s.key}
                style={[
                  styles.progressDot,
                  index === stepIndex && styles.progressDotActive,
                  index < stepIndex && styles.progressDotDone,
                ]}
              />
            ))}
          </View>

          <Text style={styles.eyebrow}>
            Step {stepIndex + 1} of {steps.length}
          </Text>
          <Text style={styles.icon}>{step.icon}</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          <AuthButton
            loading={continuing}
            onPress={() => void handleContinue()}
            title={step.buttonTitle}
          />
          <Text style={styles.dismissLink} onPress={onDismiss}>
            Not now
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      flex: 1,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.background.primary,
      borderRadius: radii.lg,
      gap: spacing.sm,
      padding: spacing.lg,
      width: '100%',
    },
    progressRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      marginBottom: spacing.sm,
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
      textAlign: 'center',
    },
    description: {
      ...typography.subtitle,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    dismissLink: {
      ...typography.caption,
      color: colors.text.secondary,
      fontWeight: '600',
      paddingTop: spacing.xs,
      textAlign: 'center',
    },
  });
}
