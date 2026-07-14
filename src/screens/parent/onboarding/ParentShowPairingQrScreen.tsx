import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { AuthButton, ScreenLayout } from '../../../components';
import { InfoTipCard } from '../../../components/parent';
import { PARENT_ONBOARDING_TOTAL_STEPS } from '../../../constants/parentOnboarding';
import { buildPairingQrValue } from '../../../constants/pairing';
import { useTheme } from '../../../context/ThemeContext';
import {
  createPairingSession,
  subscribeToPairingSession,
  type PairingSession,
} from '../../../lib/pairing';
import { supabase } from '../../../lib/supabase';
import { useParentSetup } from '../../../navigation/ParentSetupGate';
import type { ParentOnboardingParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { radii, spacing, typography } from '../../../theme';
import { ParentOnboardingStepLayout } from './ParentOnboardingStepLayout';

type Props = NativeStackScreenProps<ParentOnboardingParamList, 'ShowPairingQr'>;

function formatExpiry(expiresAt: string): string {
  const expiresDate = new Date(expiresAt);
  const minutesLeft = Math.max(
    1,
    Math.ceil((expiresDate.getTime() - Date.now()) / 60_000),
  );

  return `Expires in ${minutesLeft} min`;
}

export function ParentShowPairingQrScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { finishOnboarding } = useParentSetup();
  const [session, setSession] = useState<PairingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    'Waiting for your child to scan this code…',
  );

  useEffect(() => {
    let cancelled = false;

    const startSession = async () => {
      setLoading(true);
      setError(null);

      const result = await createPairingSession();
      if (cancelled) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSession(result.session);
    };

    void startSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const handleClaimed = (childId: string) => {
      setStatusMessage('Device linked!');
      navigation.replace('PairingSuccess', { childId });
    };

    const unsubscribeRealtime = subscribeToPairingSession(
      session.sessionId,
      row => {
        if (row.status === 'claimed' && row.child_id) {
          handleClaimed(row.child_id);
        }
      },
    );

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('pairing_sessions')
        .select('status, child_id')
        .eq('id', session.sessionId)
        .maybeSingle();

      if (data?.status === 'claimed' && data.child_id) {
        handleClaimed(data.child_id);
      }
    }, 3000);

    return () => {
      unsubscribeRealtime();
      clearInterval(pollInterval);
    };
  }, [navigation, session]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    const result = await createPairingSession();
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSession(result.session);
    setStatusMessage('Waiting for your child to scan this code…');
  };

  const handleSkip = async () => {
    if (skipping) {
      return;
    }
    setSkipping(true);
    try {
      await finishOnboarding();
    } finally {
      setSkipping(false);
    }
  };

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      scrollable
      contentStyle={styles.content}>
      <ParentOnboardingStepLayout
        currentStep={3}
        icon="🔳"
        subtitle="Open ParentKey Child on the other phone and scan this QR code."
        title="Link with QR code"
        totalSteps={PARENT_ONBOARDING_TOTAL_STEPS}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brand.tealLight} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <AuthButton onPress={() => void handleRefresh()} title="Try again" />
            <AuthButton
              loading={skipping}
              onPress={() => void handleSkip()}
              title="Skip for now"
              variant="secondary"
            />
          </View>
        ) : session ? (
          <>
            <View style={styles.qrCard}>
              <QRCode
                backgroundColor={colors.background.primary}
                color={colors.text.primary}
                size={220}
                value={buildPairingQrValue(session.token)}
              />
            </View>

            <Text style={styles.status}>{statusMessage}</Text>
            <Text style={styles.expiry}>{formatExpiry(session.expiresAt)}</Text>

            <InfoTipCard message="After scanning, your child will complete consent, profile, and permissions on their phone." />

            <AuthButton
              onPress={() => void handleRefresh()}
              title="Generate new code"
              variant="secondary"
            />
            <AuthButton
              loading={skipping}
              onPress={() => void handleSkip()}
              title="Skip for now"
              variant="secondary"
            />
          </>
        ) : null}
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
    centered: {
      alignItems: 'center',
      gap: spacing.md,
      justifyContent: 'center',
      paddingVertical: spacing.xl,
    },
    qrCard: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: colors.background.primary,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.lg,
    },
    status: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
      textAlign: 'center',
    },
    expiry: {
      ...typography.caption,
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
