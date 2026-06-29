import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as ReactNativeDeviceActivity from 'react-native-device-activity';
import { AuthButton } from '../AuthButton';
import { InfoTipCard } from '../parent/InfoTipCard';
import {
  formatScreenTimeAuthError,
  getAuthorizationStatus,
  isIOSScreenTimeSupported,
  requestChildAuthorization,
  requestIndividualAuthorization,
  type IOSScreenTimeAuthorizationStatus,
} from '../../lib/iosScreenTime';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = {
  onStatusChange?: (status: IOSScreenTimeAuthorizationStatus) => void;
};

export function IOSScreenTimeAuthSection({ onStatusChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [authStatus, setAuthStatus] = useState(getAuthorizationStatus);
  const [requestingAuth, setRequestingAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isIOSScreenTimeSupported()) {
      return;
    }

    const subscription = ReactNativeDeviceActivity.onAuthorizationStatusChange(
      () => {
        const status = getAuthorizationStatus();
        setAuthStatus(status);
        onStatusChange?.(status);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [onStatusChange]);

  const handleRequestAuthorization = async (
    mode: 'child' | 'individual',
  ) => {
    setError(null);
    setRequestingAuth(true);

    try {
      const status =
        mode === 'child'
          ? await requestChildAuthorization()
          : await requestIndividualAuthorization();

      setAuthStatus(status);
      onStatusChange?.(status);

      if (status !== 'approved') {
        setError(
          mode === 'child'
            ? 'Screen Time access was not approved. Make sure this iPhone uses a Child Apple ID from Family Sharing, then try again.'
            : 'Screen Time access was not approved. Check Settings → Screen Time on this iPhone.',
        );
      }
    } catch (authError) {
      const message =
        authError instanceof Error
          ? authError.message
          : 'Could not request Screen Time access.';
      setError(formatScreenTimeAuthError(message));
    } finally {
      setRequestingAuth(false);
    }
  };

  if (!isIOSScreenTimeSupported()) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>1. Allow Screen Time access</Text>
      <InfoTipCard message="Apple requires this iPhone to be signed into a Child Apple ID (created in Settings → Family on the parent's phone). Your ParentKey child login is separate from the device's iCloud account." />
      <Text style={styles.stepText}>
        ParentKey uses Apple&apos;s Family Controls APIs. This step must run on
        the child&apos;s iPhone with the child&apos;s Apple ID signed into
        iCloud.
      </Text>
      <Text style={styles.statusText}>
        Status:{' '}
        <Text style={styles.statusValue}>
          {authStatus === 'approved'
            ? 'Approved'
            : authStatus === 'denied'
              ? 'Denied'
              : 'Not granted yet'}
        </Text>
      </Text>
      {authStatus !== 'approved' ? (
        <AuthButton
          loading={requestingAuth}
          onPress={() => void handleRequestAuthorization('child')}
          title="Grant Screen Time access"
        />
      ) : null}
      {__DEV__ && authStatus !== 'approved' ? (
        <>
          <Text style={styles.devNote}>
            Developer only: if you are testing with your own adult Apple ID (not
            a Family Sharing child account), use the button below.
          </Text>
          <AuthButton
            loading={requestingAuth}
            onPress={() => void handleRequestAuthorization('individual')}
            title="Grant access (developer test)"
            variant="secondary"
          />
        </>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {requestingAuth ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.brand.tealLight} size="small" />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    stepTitle: {
      ...typography.label,
      color: colors.text.primary,
    },
    stepText: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    statusText: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    statusValue: {
      color: colors.text.brand,
      fontWeight: '700',
    },
    devNote: {
      ...typography.caption,
      color: colors.text.placeholder,
      lineHeight: 18,
    },
    errorText: {
      ...typography.caption,
      color: colors.error,
      lineHeight: 20,
    },
    loadingRow: {
      alignItems: 'center',
      paddingTop: spacing.xs,
    },
  });
}
