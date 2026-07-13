import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout } from '../../components';
import { ChildSetupStepLayout } from '../../components/child/ChildSetupStepLayout';
import { CHILD_SETUP_TOTAL_STEPS } from '../../constants/childSetup';
import {
  getChildPermissionSteps,
  type ChildPermissionKey,
} from '../../lib/childPermissions';
import type { ChildStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

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
  const steps = useMemo(() => getChildPermissionSteps(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [checking, setChecking] = useState(true);
  const [continuing, setContinuing] = useState(false);
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
  const awaitingPermissionRef = useRef(false);

  const step = steps[stepIndex];
  const currentGranted = step ? grantedFlags[step.key] : false;

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
        awaitingPermissionRef.current = false;
        setContinuing(false);
        navigation.replace('ChildDeviceSync');
        return;
      }

      if (nextIndex !== stepIndex) {
        awaitingPermissionRef.current = false;
        setContinuing(false);
      }

      setStepIndex(nextIndex);
    },
    [navigation, stepIndex, steps],
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
        const key = steps[stepIndex]?.key;
        if (!key) {
          return;
        }

        if (statuses[key]) {
          advancePastGranted(statuses, stepIndex);
          return;
        }

        // Returned from Settings without granting — stop loader so they can retry.
        if (awaitingPermissionRef.current) {
          awaitingPermissionRef.current = false;
          setContinuing(false);
        }
      });
    });

    return () => subscription.remove();
  }, [advancePastGranted, refreshStatuses, stepIndex, steps]);

  // While waiting on a permission, keep checking so auto-return from Settings
  // advances even if AppState is slow or missed on some devices.
  useEffect(() => {
    if (checking || !step || grantedFlags[step.key]) {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshStatuses().then(statuses => {
        if (statuses[step.key]) {
          advancePastGranted(statuses, stepIndex);
        }
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [
    advancePastGranted,
    checking,
    grantedFlags,
    refreshStatuses,
    step,
    stepIndex,
  ]);

  const handleOpenSettings = async () => {
    if (!step || continuing) {
      return;
    }

    setActionError(null);
    awaitingPermissionRef.current = true;
    setContinuing(true);
    try {
      await step.openSettings();
    } catch (error) {
      awaitingPermissionRef.current = false;
      setContinuing(false);
      const message =
        error instanceof Error
          ? error.message
          : 'Could not open settings. Please try again.';
      setActionError(message);
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
      safeAreaEdges={['top', 'left', 'right']}
      contentStyle={styles.content}>
      <View style={styles.root}>
        <View style={styles.setupContent}>
          <ChildSetupStepLayout
            currentStep={stepIndex + 3}
            icon={step.icon}
            subtitle={step.description}
            title={step.title}
            totalSteps={CHILD_SETUP_TOTAL_STEPS}>
            {actionError ? (
              <Text style={styles.errorText}>{actionError}</Text>
            ) : null}
          </ChildSetupStepLayout>
        </View>

        {!currentGranted ? (
          <View style={styles.footer}>
            <AuthButton
              loading={continuing}
              onPress={() => void handleOpenSettings()}
              title={step.buttonTitle}
            />
          </View>
        ) : null}
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      flex: 1,
    },
    root: {
      flex: 1,
    },
    setupContent: {
      flex: 1,
      paddingBottom: 160,
    },
    footer: {
      bottom: 100,
      left: 0,
      position: 'absolute',
      right: 0,
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
    errorText: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
    },
  });
}
