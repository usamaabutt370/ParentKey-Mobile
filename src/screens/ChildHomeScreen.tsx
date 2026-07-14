import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { AuthButton, ScreenLayout, useScreenStyles } from '../components';
import { ChildDeviceAppsList } from '../components/android/ChildDeviceAppsList';
import { InfoTipCard } from '../components/parent';
import { IOSScreenTimeAuthSection } from '../components/ios/IOSScreenTimeAuthSection';
import { IOSScreenTimePanel } from '../components/ios/IOSScreenTimePanel';
import { useAuth } from '../context/AuthContext';
import { useChildAppBlocking } from '../hooks/useChildAppBlocking';
import {
  fetchOwnChildUninstallAllowed,
  subscribeToChildUninstallAllowed,
} from '../lib/children';
import { clearChildSetupComplete } from '../lib/childSetup';
import {
  areAllChildPermissionsGranted,
  deactivateDeviceAdmin,
  isDeviceAdminActive,
  requestDeviceAdmin,
} from '../lib/childPermissions';
import type { IOSScreenTimeAuthorizationStatus } from '../lib/iosScreenTime';
import type { ChildStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import type { ColorPalette } from '../theme/colors';
import { radii, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<ChildStackParamList, 'ChildHome'>;

function formatLastSync(value: string | null): string {
  if (!value) {
    return 'Not synced yet';
  }

  return new Date(value).toLocaleString();
}

export function ChildHomeScreen({ navigation }: Props) {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session, signOut } = useAuth();
  const childId = session?.user.id;
  const firstName = session?.user.user_metadata?.first_name;
  const [authStatus, setAuthStatus] =
    useState<IOSScreenTimeAuthorizationStatus>('notDetermined');
  const authApproved = authStatus === 'approved';
  const androidBlocking = useChildAppBlocking();
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [uninstallAllowed, setUninstallAllowed] = useState(false);
  const [deviceAdminActive, setDeviceAdminActive] = useState(false);
  const [updatingAdmin, setUpdatingAdmin] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    void areAllChildPermissionsGranted().then(setPermissionsReady);
    void isDeviceAdminActive().then(setDeviceAdminActive);
  }, [
    androidBlocking.accessibilityEnabled,
    androidBlocking.usageAccessGranted,
    androidBlocking.lastSyncedAt,
  ]);

  useEffect(() => {
    if (!childId || Platform.OS !== 'android') {
      return;
    }

    const applyUninstallPolicy = async (allowed: boolean) => {
      setUninstallAllowed(allowed);

      if (allowed) {
        try {
          await deactivateDeviceAdmin();
          setDeviceAdminActive(false);
        } catch {
          // Parent already allowed uninstall; ignore if admin was already off.
        }
        return;
      }

      const active = await isDeviceAdminActive();
      setDeviceAdminActive(active);
    };

    void fetchOwnChildUninstallAllowed(childId).then(result => {
      if (result.ok) {
        void applyUninstallPolicy(result.allowed);
      }
    });

    const unsubscribe = subscribeToChildUninstallAllowed(childId, allowed => {
      void applyUninstallPolicy(allowed);
    });

    const pollInterval = setInterval(() => {
      void fetchOwnChildUninstallAllowed(childId).then(result => {
        if (result.ok) {
          void applyUninstallPolicy(result.allowed);
        }
      });
    }, 5000);

    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void fetchOwnChildUninstallAllowed(childId).then(result => {
          if (result.ok) {
            void applyUninstallPolicy(result.allowed);
          }
        });
        void isDeviceAdminActive().then(setDeviceAdminActive);
      }
    });

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      appStateSub.remove();
    };
  }, [childId]);

  const handleSignOut = async () => {
    if (childId) {
      await clearChildSetupComplete(childId);
    }

    await signOut();
  };

  const handleRestoreProtection = async () => {
    setUpdatingAdmin(true);
    try {
      await requestDeviceAdmin();
    } finally {
      setUpdatingAdmin(false);
      void isDeviceAdminActive().then(setDeviceAdminActive);
    }
  };

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={screenStyles.brand}>ParentKey Child</Text>
        <Text style={[screenStyles.title, styles.title]}>
          {firstName ? `Hi, ${firstName}` : 'Connected'}
        </Text>
        <Text style={screenStyles.subtitle}>
          This device is linked to your parent
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Feather
              color={permissionsReady ? colors.success : colors.error}
              name={permissionsReady ? 'check-circle' : 'alert-circle'}
              size={20}
            />
            <Text style={styles.statusTitle}>
              {permissionsReady ? 'Protection active' : 'Setup incomplete'}
            </Text>
          </View>
          <Text style={styles.statusBody}>
            Last sync: {formatLastSync(androidBlocking.lastSyncedAt)}
          </Text>
          <Text style={styles.statusBody}>
            Apps on device: {androidBlocking.installedApps.length}
          </Text>
          <Text style={styles.statusBody}>
            Blocked apps: {androidBlocking.blockedCount}
          </Text>
          <Text style={styles.statusBody}>
            Uninstall:{' '}
            {uninstallAllowed
              ? 'Allowed by parent'
              : deviceAdminActive
                ? 'Protected'
                : 'Not protected'}
          </Text>
        </View>

        {uninstallAllowed && Platform.OS === 'android' ? (
          <InfoTipCard message="Your parent allowed uninstall. Device Admin is off, so ParentKey Child can be removed from Settings → Apps." />
        ) : null}

        {!uninstallAllowed &&
        Platform.OS === 'android' &&
        !deviceAdminActive ? (
          <>
            <InfoTipCard message="Uninstall protection is off. Ask your parent to keep Allow app uninstall off, then turn Device Admin back on." />
            <AuthButton
              loading={updatingAdmin}
              onPress={() => void handleRestoreProtection()}
              title="Restore uninstall protection"
              variant="secondary"
            />
          </>
        ) : null}

        {!permissionsReady && Platform.OS === 'android' ? (
          <>
            <InfoTipCard message="Some permissions are still missing. Finish setup so your parent can manage this device." />
            <AuthButton
              onPress={() => navigation.navigate('ChildPermissions')}
              title="Finish permissions"
              variant="secondary"
            />
          </>
        ) : null}

        {Platform.OS === 'ios' ? (
          <>
            <InfoTipCard message="Set up Screen Time on this iPhone so your parent can block or limit apps." />
            <IOSScreenTimeAuthSection onStatusChange={setAuthStatus} />
            <IOSScreenTimePanel authApproved={authApproved} mode="block" stepOffset={1} />
            <IOSScreenTimePanel authApproved={authApproved} mode="limit" stepOffset={1} />
          </>
        ) : (
          <>
            <AuthButton
              loading={androidBlocking.syncing}
              onPress={() => void androidBlocking.syncNow()}
              title="Sync apps now"
              variant="secondary"
            />

            {androidBlocking.error ? (
              <Text style={styles.errorText}>{androidBlocking.error}</Text>
            ) : null}

            <ChildDeviceAppsList
              apps={androidBlocking.installedApps}
              blockedPackages={androidBlocking.blockedPackages}
              loading={androidBlocking.appsLoading || androidBlocking.syncing}
            />
          </>
        )}

        <AuthButton
          onPress={() => void handleSignOut()}
          title="Unlink device"
          variant="secondary"
        />
      </ScrollView>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.md,
      paddingBottom: spacing.xl,
    },
    title: {
      fontSize: 28,
    },
    statusCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statusTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    statusBody: {
      ...typography.body,
      color: colors.text.secondary,
    },
    errorText: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
    },
  });
}
