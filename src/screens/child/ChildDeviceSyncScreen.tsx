import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { AuthButton, ScreenLayout } from '../../components';
import { ChildSetupStepLayout } from '../../components/child/ChildSetupStepLayout';
import { CHILD_SETUP_TOTAL_STEPS } from '../../constants/childSetup';
import { useAuth } from '../../context/AuthContext';
import { useChildAppBlocking } from '../../hooks/useChildAppBlocking';
import { markChildSetupComplete } from '../../lib/childSetup';
import { useTheme } from '../../context/ThemeContext';
import type { ChildStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ChildStackParamList, 'ChildDeviceSync'>;

type SyncPhase = 'registering' | 'scanning' | 'done' | 'error';

export function ChildDeviceSyncScreen({ navigation }: Props) {
  const { session } = useAuth();
  const childId = session?.user.id;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { syncNow, installedApps, error } = useChildAppBlocking({
    autoSync: false,
  });
  const [phase, setPhase] = useState<SyncPhase>('registering');
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!childId || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const runSync = async () => {
      setPhase('registering');
      await new Promise<void>(resolve => {
        setTimeout(resolve, 600);
      });
      setPhase('scanning');
      const result = await syncNow();
      setPhase(result.ok ? 'done' : 'error');
    };

    void runSync();
  }, [childId, syncNow]);

  useEffect(() => {
    if (phase === 'done' && childId) {
      void markChildSetupComplete(childId);
    }
  }, [childId, phase]);

  const statusMessage =
    phase === 'registering'
      ? 'Registering this device with your parent…'
      : phase === 'scanning'
        ? 'Scanning installed apps on this phone…'
        : phase === 'done'
          ? `Found ${installedApps.length} apps. Your parent can now manage this device.`
          : error ?? 'Could not sync device information.';

  const handleFinish = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ChildHome' }],
    });
  };

  const handleRetry = async () => {
    setPhase('scanning');
    const result = await syncNow();
    setPhase(result.ok ? 'done' : 'error');
  };

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      scrollable
      contentStyle={styles.content}>
      <ChildSetupStepLayout
        currentStep={CHILD_SETUP_TOTAL_STEPS}
        icon={phase === 'done' ? '✅' : '📱'}
        subtitle={statusMessage}
        title={phase === 'done' ? 'Device ready' : 'Setting up this device'}
        totalSteps={CHILD_SETUP_TOTAL_STEPS}>
        <View style={styles.centered}>
          {phase === 'done' ? (
            <View style={styles.checkCircle}>
              <Feather color={colors.brand.tealLight} name="check" size={36} />
            </View>
          ) : phase === 'error' ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <ActivityIndicator color={colors.brand.tealLight} size="large" />
          )}
        </View>

        {phase === 'done' ? (
          <AuthButton onPress={handleFinish} title="Go to home" />
        ) : phase === 'error' ? (
          <AuthButton onPress={() => void handleRetry()} title="Try again" />
        ) : null}
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
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
    },
    checkCircle: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: 999,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    errorText: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
    },
  });
}
