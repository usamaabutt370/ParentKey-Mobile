import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { AuthButton, ScreenLayout } from '../../../components';
import { PARENT_ONBOARDING_TOTAL_STEPS } from '../../../constants/parentOnboarding';
import { useTheme } from '../../../context/ThemeContext';
import { useParentChildren } from '../../../hooks/useParentChildren';
import { getChildDisplayName } from '../../../lib/children';
import { useParentSetup } from '../../../navigation/ParentSetupGate';
import type { ParentOnboardingParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { radii, spacing, typography } from '../../../theme';
import { ParentOnboardingStepLayout } from './ParentOnboardingStepLayout';

type Props = NativeStackScreenProps<ParentOnboardingParamList, 'PairingSuccess'>;

export function ParentPairingSuccessScreen({ route }: Props) {
  const { childId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { finishOnboarding } = useParentSetup();
  const { children, loading } = useParentChildren();
  const child = children.find(item => item.id === childId);
  const displayName = child ? getChildDisplayName(child) : 'Your child';
  const [finishing, setFinishing] = useState(false);

  const handleGoToDashboard = async () => {
    if (finishing) {
      return;
    }

    setFinishing(true);
    try {
      await finishOnboarding();
    } finally {
      setFinishing(false);
    }
  };

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      scrollable
      contentStyle={styles.content}>
      <ParentOnboardingStepLayout
        currentStep={4}
        icon="✅"
        subtitle="Their device is connected. They can finish permissions on their phone while you manage from here."
        title={`${displayName} is linked!`}
        totalSteps={PARENT_ONBOARDING_TOTAL_STEPS}>
        <View style={styles.checkCircle}>
          <Feather color={colors.brand.tealLight} name="check" size={36} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={[styles.summaryValue, styles.status]}>Device linked</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.brand.tealLight} size="small" />
          ) : null}
        </View>

        <AuthButton
          loading={finishing}
          onPress={() => void handleGoToDashboard()}
          title="Go to dashboard"
        />
      </ParentOnboardingStepLayout>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
    },
    checkCircle: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: radii.pill,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    summaryCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    summaryRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    summaryLabel: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    summaryValue: {
      ...typography.label,
      color: colors.text.primary,
    },
    status: {
      color: colors.success,
    },
  });
}
