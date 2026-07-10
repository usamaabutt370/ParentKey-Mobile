import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { AuthButton, ScreenLayout } from '../../components';
import { InfoTipCard } from '../../components/parent';
import { parsePairingTokenFromQr } from '../../constants/pairing';
import { useTheme } from '../../context/ThemeContext';
import { claimPairingWithToken } from '../../lib/pairing';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

export function ChildPairingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handledToken, setHandledToken] = useState<string | null>(null);

  const handleScan = useCallback(
    async (result: BarcodeScanningResult) => {
      if (claiming) {
        return;
      }

      const token = parsePairingTokenFromQr(result.data);
      if (!token || token === handledToken) {
        return;
      }

      setHandledToken(token);
      setClaiming(true);
      setError(null);

      const claimResult = await claimPairingWithToken(token);
      setClaiming(false);

      if (!claimResult.ok) {
        setError(claimResult.message);
        setHandledToken(null);
      }
    },
    [claiming, handledToken],
  );

  if (!permission) {
    return (
      <ScreenLayout contentStyle={styles.centered}>
        <Text style={styles.subtitle}>Checking camera permission…</Text>
      </ScreenLayout>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenLayout scrollable contentStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brand}>ParentKey Child</Text>
          <Text style={styles.title}>Link this device</Text>
          <Text style={styles.subtitle}>
            Scan the QR code from your parent&apos;s phone to connect this
            device. No email or password needed.
          </Text>
        </View>

        <InfoTipCard message="Camera access is required to scan your parent's QR code." />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AuthButton
          loading={claiming}
          onPress={() => void requestPermission()}
          title="Allow camera access"
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout contentStyle={styles.scannerLayout}>
      <View style={styles.scannerHeader}>
        <Text style={styles.brand}>ParentKey Child</Text>
        <Text style={styles.scannerTitle}>Scan parent QR code</Text>
        <Text style={styles.scannerSubtitle}>
          Point your camera at the QR code shown in the parent app.
        </Text>
      </View>

      <View style={styles.cameraFrame}>
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          facing="back"
          onBarcodeScanned={claiming ? undefined : handleScan}
          style={styles.camera}
        />
        <View pointerEvents="none" style={styles.cameraOverlay} />
      </View>

      {claiming ? (
        <Text style={styles.status}>Linking device…</Text>
      ) : (
        <Text style={styles.status}>Waiting for QR code…</Text>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
      justifyContent: 'center',
    },
    header: {
      gap: spacing.sm,
    },
    brand: {
      color: colors.text.brand,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 28,
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
    },
    scannerLayout: {
      gap: spacing.lg,
    },
    scannerHeader: {
      gap: spacing.xs,
    },
    scannerTitle: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 24,
      textAlign: 'center',
    },
    scannerSubtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    cameraFrame: {
      alignSelf: 'center',
      borderColor: colors.brand.teal,
      borderRadius: radii.lg,
      borderWidth: 2,
      height: 280,
      overflow: 'hidden',
      width: 280,
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
      ...StyleSheet.absoluteFill,
      borderColor: 'rgba(255, 255, 255, 0.35)',
      borderRadius: radii.lg,
      borderWidth: 1,
      margin: spacing.md,
    },
    status: {
      ...typography.label,
      color: colors.text.primary,
      textAlign: 'center',
    },
    errorText: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
    },
  });
}
