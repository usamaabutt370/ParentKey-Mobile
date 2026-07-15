import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { AuthButton, ScreenLayout } from '../../components';
import { InfoTipCard, ScreenHeader } from '../../components/parent';
import { buildPairingQrValue } from '../../constants/pairing';
import { useTheme } from '../../context/ThemeContext';
import { useExpiryCountdown } from '../../hooks/useExpiryCountdown';
import {
  createPairingSession,
  subscribeToPairingSession,
  type PairingSession,
} from '../../lib/pairing';
import { supabase } from '../../lib/supabase';
import type { ChildrenStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ChildrenStackParamList, 'PairChildQr'>;

export function PairChildQrScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [session, setSession] = useState<PairingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    'Waiting for your child to scan this code…',
  );
  const expiryLabel = useExpiryCountdown(session?.expiresAt);

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
      navigation.replace('PairChildSuccess', { childId });
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

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        subtitle="Have your child open the ParentKey Child app and scan this code"
        title="Link with QR code"
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand.tealLight} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <AuthButton onPress={() => void handleRefresh()} title="Try again" />
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
          <Text style={styles.expiry}>{expiryLabel}</Text>

          <InfoTipCard message="On the child device, open ParentKey Child. The app will ask for camera access, then scan this QR code. No email or password is needed." />

          <AuthButton
            onPress={() => void handleRefresh()}
            title="Generate new code"
            variant="secondary"
          />
        </>
      ) : null}
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
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
