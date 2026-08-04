import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { AuthButton, ScreenLayout, useScreenStyles } from '../../components';
import { ChildCard, SectionHeader } from '../../components/parent';
import { buildPairingQrValue } from '../../constants/pairing';
import { useTheme } from '../../context/ThemeContext';
import { useExpiryCountdown } from '../../hooks/useExpiryCountdown';
import { useParentActivityDashboard } from '../../hooks/useParentActivityDashboard';
import { useParentChildren } from '../../hooks/useParentChildren';
import {
  createPairingSession,
  subscribeToPairingSession,
  type PairingSession,
} from '../../lib/pairing';
import { supabase } from '../../lib/supabase';
import type { ChildrenStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ChildrenStackParamList, 'ChildrenList'>;

export function ParentChildrenScreen({ navigation }: Props) {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children, loading, error, refresh } = useParentChildren();
  const { childSummaries, loading: activityLoading } =
    useParentActivityDashboard();

  const [pairingVisible, setPairingVisible] = useState(false);
  const [session, setSession] = useState<PairingSession | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    'Waiting for your child to scan this code…',
  );
  const expiryLabel = useExpiryCountdown(session?.expiresAt);

  const summaryByChildId = useMemo(
    () => new Map(childSummaries.map(item => [item.childId, item])),
    [childSummaries],
  );

  const startPairingSession = async () => {
    setPairingVisible(true);
    setQrLoading(true);
    setQrError(null);
    setStatusMessage('Waiting for your child to scan this code…');

    const result = await createPairingSession();
    setQrLoading(false);

    if (!result.ok) {
      setSession(null);
      setQrError(result.message);
      return;
    }

    setSession(result.session);
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    const handleClaimed = (childId: string) => {
      setStatusMessage('Device linked!');
      setPairingVisible(false);
      setSession(null);
      void refresh();
      navigation.navigate('PairChildSuccess', { childId });
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
  }, [navigation, refresh, session]);

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Children</Text>
        <Text style={screenStyles.subtitle}>
          Manage profiles, devices, and linked accounts
        </Text>
      </View>

      <AuthButton
        onPress={() => void startPairingSession()}
        title={pairingVisible ? 'Generate new code' : 'Add child'}
      />

      {pairingVisible ? (
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Link with QR code</Text>
          <Text style={styles.qrSubtitle}>
            Have your child open the ParentKey Child app and scan this code
          </Text>

          {qrLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.brand.tealLight} size="large" />
            </View>
          ) : qrError ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{qrError}</Text>
              <AuthButton
                onPress={() => void startPairingSession()}
                title="Try again"
              />
            </View>
          ) : session ? (
            <>
              <View style={styles.qrCard}>
                <QRCode
                  backgroundColor={colors.background.primary}
                  color={colors.text.primary}
                  size={200}
                  value={buildPairingQrValue(session.token)}
                />
              </View>
              <Text style={styles.status}>{statusMessage}</Text>
              <Text style={styles.expiry}>{expiryLabel}</Text>
              <AuthButton
                onPress={() => {
                  setPairingVisible(false);
                  setSession(null);
                  setQrError(null);
                }}
                title="Hide code"
                variant="secondary"
              />
            </>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Linked children" />
        {loading || activityLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brand.tealLight} size="large" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : children.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No children linked yet</Text>
            <Text style={styles.emptyBody}>
              Tap Add child to generate a QR code your child can scan to link
              their device.
            </Text>
          </View>
        ) : (
          <View style={styles.childList}>
            {children.map(child => {
              const activity = summaryByChildId.get(child.id);

              return (
                <ChildCard
                  child={child}
                  deviceStatus={activity?.deviceStatus}
                  key={child.id}
                  onPress={() =>
                    navigation.navigate('ChildDetail', { childId: child.id })
                  }
                  screenTimeToday={
                    activity && activity.todaySeconds > 0
                      ? activity.todayLabel
                      : undefined
                  }
                />
              );
            })}
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    section: {
      gap: spacing.md,
    },
    childList: {
      gap: spacing.sm,
    },
    centered: {
      alignItems: 'center',
      gap: spacing.md,
      justifyContent: 'center',
      paddingVertical: spacing.xl,
    },
    errorText: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
    },
    emptyCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    emptyTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    emptyBody: {
      ...typography.body,
      color: colors.text.secondary,
    },
    qrSection: {
      gap: spacing.md,
    },
    qrTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
    },
    qrSubtitle: {
      ...typography.caption,
      color: colors.text.secondary,
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
  });
}
