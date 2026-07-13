import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout } from '../../components';
import { ChildSetupStepLayout } from '../../components/child/ChildSetupStepLayout';
import { CHILD_SETUP_TOTAL_STEPS } from '../../constants/childSetup';
import { useAuth } from '../../context/AuthContext';
import {
  getChildPermissionSteps,
  type ChildPermissionKey,
} from '../../lib/childPermissions';
import { resetChildSession } from '../../lib/childLink';
import type { ChildStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ChildStackParamList, 'ChildPermissions'>;

function findFirstUngrantedIndex(
  steps: ReturnType<typeof getChildPermissionSteps>,
  statuses: Record<ChildPermissionKey, boolean>,
  fromIndex = 0,
): number {
  for (let index = fromIndex; index < steps.length; index += 1) {
    if (!statuses[steps[index].key]) {
      return index;
    }
  }

  return -1;
}

export function ChildPermissionsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session, signOut } = useAuth();
  const steps = useMemo(() => getChildPermissionSteps(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [checking, setChecking] = useState(true);
  const [continuing, setContinuing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [grantedFlags, setGrantedFlags] = useState<
    Record<ChildPermissionKey, boolean>
  >({
    usage: false,
    accessibility: false,
    overlay: false,
    background: false,
    deviceAdmin: false,
  });
  const hasBootstrappedRef = useRef(false);

  const refreshStatuses = useCallback(async () => {
    const entries = await Promise.all(
      steps.map(async step => [step.key, await step.isGranted()] as const),
    );

    const statuses = Object.fromEntries(entries) as Record<
      ChildPermissionKey,
      boolean
    >;
    setGrantedFlags(statuses);
    return statuses;
  }, [steps]);

  const advancePastGranted = useCallback(
    (statuses: Record<ChildPermissionKey, boolean>, fromIndex = 0) => {
      const nextIndex = findFirstUngrantedIndex(steps, statuses, fromIndex);

      if (nextIndex === -1) {
        navigation.replace('ChildDeviceSync');
        return;
      }

      setStepIndex(nextIndex);
    },
    [navigation, steps],
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setChecking(true);
      const statuses = await refreshStatuses();
      if (cancelled) {
        return;
      }

      hasBootstrappedRef.current = true;
      setChecking(false);
      advancePastGranted(statuses, 0);
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [advancePastGranted, refreshStatuses]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' || !hasBootstrappedRef.current) {
        return;
      }

      void refreshStatuses().then(statuses => {
        advancePastGranted(statuses, stepIndex);
      });
    });

    return () => subscription.remove();
  }, [advancePastGranted, refreshStatuses, stepIndex]);

  const step = steps[stepIndex];
  const currentGranted = step ? grantedFlags[step.key] : false;

  const handleOpenSettings = async () => {
    if (!step) {
      return;
    }

    setActionError(null);
    setContinuing(true);
    try {
      await step.openSettings();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not open settings. Please try again.';
      setActionError(message);
    } finally {
      setContinuing(false);
    }
  };

  const handleOpenSecondarySettings = async () => {
    if (!step?.openSecondarySettings) {
      return;
    }

    setContinuing(true);
    try {
      await step.openSecondarySettings();
    } finally {
      setContinuing(false);
    }
  };

  const handleContinue = async () => {
    if (!step) {
      return;
    }

    const statuses = await refreshStatuses();

    if (!statuses[step.key]) {
      return;
    }

    advancePastGranted(statuses, stepIndex + 1);
  };

  const handleStartOver = async () => {
    setResetting(true);
    try {
      await resetChildSession({ childId: session?.user.id, signOut });
    } finally {
      setResetting(false);
    }
  };

  if (checking || !step) {
    return (
      <ScreenLayout contentStyle={styles.loading}>
        <ActivityIndicator color={colors.brand.tealLight} size="large" />
        <Text style={styles.loadingText}>Checking permissions already granted…</Text>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      scrollable
      contentStyle={styles.content}>
      <ChildSetupStepLayout
        currentStep={stepIndex + 2}
        icon={step.icon}
        subtitle={step.description}
        title={step.title}
        totalSteps={CHILD_SETUP_TOTAL_STEPS}>
        <View
          style={[
            styles.statusCard,
            currentGranted ? styles.statusGranted : styles.statusPending,
          ]}>
          <Text style={styles.statusLabel}>
            {currentGranted ? 'Permission granted' : 'Waiting for permission'}
          </Text>
        </View>

        {!currentGranted ? (
          <AuthButton
            loading={continuing}
            onPress={() => void handleOpenSettings()}
            title={step.buttonTitle}
          />
        ) : null}
        {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
        {!currentGranted && step.secondaryButtonTitle ? (
          <AuthButton
            loading={continuing}
            onPress={() => void handleOpenSecondarySettings()}
            title={step.secondaryButtonTitle}
            variant="secondary"
          />
        ) : null}
        {currentGranted ? (
          <AuthButton
            onPress={() => void handleContinue()}
            title="Continue"
            variant="secondary"
          />
        ) : (
          <Text style={styles.hint} onPress={() => void refreshStatuses()}>
            I turned it on — check again
          </Text>
        )}
        <AuthButton
          loading={resetting}
          onPress={() => void handleStartOver()}
          title="Start over / scan new QR"
          variant="secondary"
        />
      </ChildSetupStepLayout>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
    },
    loading: {
      alignItems: 'center',
      flexGrow: 1,
      gap: spacing.md,
      justifyContent: 'center',
    },
    loadingText: {
      ...typography.subtitle,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    statusCard: {
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.md,
    },
    statusPending: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
    },
    statusGranted: {
      backgroundColor: colors.background.accentStrong,
      borderColor: colors.brand.teal,
    },
    statusLabel: {
      ...typography.label,
      color: colors.text.primary,
      textAlign: 'center',
    },
    hint: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '600',
      textAlign: 'center',
    },
    errorText: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
    },
  });
}
