import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
// import QRCode from 'react-native-qrcode-svg';
import { InfoTipCard, ScreenHeader } from '../../components/parent';
import { AuthButton, ScreenLayout } from '../../components';
import {
  HorizontalAppsStrip,
  type HorizontalAppItem,
} from '../../components/HorizontalAppsStrip';
import { getChildAvatar } from '../../constants/childAvatars';
// import { buildPairingQrValue } from '../../constants/pairing';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
// import { useExpiryCountdown } from '../../hooks/useExpiryCountdown';
import {
  fetchChildBlockRules,
  fetchChildInstalledApps,
  removeChildBlockRule,
  type AppBlockRule,
} from '../../lib/appRules';
import {
  fetchChildById,
  getChildDisplayName,
  deleteChildAccount,
} from '../../lib/children';
import {
  buildAppIconLookup,
  mergeInstalledAppIcons,
  type AppIconData,
} from '../../lib/installedApps';
import {
  // createReconnectSession,
  subscribeToPairingSession,
  type PairingSession,
} from '../../lib/pairing';
import { supabase } from '../../lib/supabase';
import type { ChildrenStackParamList } from '../../navigation/types';
import type { ChildProfile } from '../../types/child';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ChildrenStackParamList, 'ChildDetail'>;

function formatLinkedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ChildDetailScreen({ navigation, route }: Props) {
  const { childId } = route.params;
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [blockRules, setBlockRules] = useState<AppBlockRule[]>([]);
  const [appIcons, setAppIcons] = useState<Map<string, AppIconData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingPackage, setUnblockingPackage] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [reconnectSession, setReconnectSession] =
    useState<PairingSession | null>(null);
  // const [reconnectLoading, setReconnectLoading] = useState(false);
  // const [reconnectError, setReconnectError] = useState<string | null>(null);
  // const reconnectExpiryLabel = useExpiryCountdown(reconnectSession?.expiresAt);

  const loadChild = useCallback(async () => {
    const parentId = session?.user.id;

    if (!parentId) {
      setChild(null);
      setBlockRules([]);
      setError('You must be signed in to view child details.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [childResult, rulesResult, installedAppsResult] = await Promise.all([
      fetchChildById(parentId, childId),
      fetchChildBlockRules(childId),
      fetchChildInstalledApps(childId),
    ]);

    if (childResult.ok) {
      setChild(childResult.child);
    } else {
      setChild(null);
      setError(childResult.message);
    }

    if (rulesResult.ok) {
      setBlockRules(rulesResult.rules);
    } else if (childResult.ok) {
      setBlockRules([]);
    }

    if (installedAppsResult.ok) {
      const appsWithIcons = await mergeInstalledAppIcons(
        installedAppsResult.apps.map(app => ({
          packageName: app.packageName,
          iconUri: null,
          iconBase64: app.iconBase64,
        })),
      );
      setAppIcons(buildAppIconLookup(appsWithIcons));
    } else {
      setAppIcons(new Map());
    }

    setLoading(false);
  }, [childId, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadChild();
    }, [loadChild]),
  );

  // const startReconnect = useCallback(async () => {
  //   setReconnectLoading(true);
  //   setReconnectError(null);

  //   const result = await createReconnectSession(childId);
  //   setReconnectLoading(false);

  //   if (!result.ok) {
  //     setReconnectSession(null);
  //     setReconnectError(result.message);
  //     return;
  //   }

  //   setReconnectSession(result.session);
  // }, [childId]);

  useEffect(() => {
    if (!reconnectSession) {
      return;
    }

    const handleClaimed = () => {
      setReconnectSession(null);
      void loadChild();
      Alert.alert(
        'Device reconnected',
        'This device is linked to the same child account again.',
      );
    };

    const unsubscribe = subscribeToPairingSession(
      reconnectSession.sessionId,
      row => {
        if (row.status === 'claimed') {
          handleClaimed();
        }
      },
    );

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('pairing_sessions')
        .select('status')
        .eq('id', reconnectSession.sessionId)
        .maybeSingle();

      if (data?.status === 'claimed') {
        handleClaimed();
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [loadChild, reconnectSession]);

  const handleUnblock = (rule: AppBlockRule) => {
    const parentId = session?.user.id;
    if (!parentId) {
      return;
    }

    const displayName = rule.appName ?? rule.packageName;

    Alert.alert(
      'Unblock app',
      `Allow ${displayName} on this child's device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            void (async () => {
              setUnblockingPackage(rule.packageName);

              const result = await removeChildBlockRule({
                parentId,
                childId,
                packageName: rule.packageName,
              });

              setUnblockingPackage(null);

              if (!result.ok) {
                Alert.alert('Could not unblock', result.message);
                return;
              }

              setBlockRules(current =>
                current.filter(item => item.packageName !== rule.packageName),
              );
            })();
          },
        },
      ],
    );
  };

  const handleManageBlocks = () => {
    navigation.getParent()?.navigate('Controls', {
      screen: 'SelectApps',
      params: { mode: 'block', childId },
    });
  };

  const handleDeleteChild = () => {
    const parentId = session?.user.id;
    if (!parentId || !child) {
      return;
    }

    Alert.alert(
      'Delete child account',
      `Permanently remove ${getChildDisplayName(child)}'s account? Their blocked apps and device data will be deleted and they will no longer be able to sign in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);

              const result = await deleteChildAccount({
                parentId,
                childId,
              });

              setDeleting(false);

              if (!result.ok) {
                Alert.alert('Could not delete child', result.message);
                return;
              }

              navigation.goBack();
            })();
          },
        },
      ],
    );
  };

  const avatar = getChildAvatar(child?.avatarId ?? undefined);
  const displayName = child ? getChildDisplayName(child) : 'Child';
  const blockedAppItems = useMemo<HorizontalAppItem[]>(
    () =>
      blockRules.map(rule => {
        const icons = appIcons.get(rule.packageName);
        return {
          id: rule.id,
          packageName: rule.packageName,
          name: rule.appName ?? rule.packageName,
          subtitle:
            unblockingPackage === rule.packageName ? 'Unblocking…' : 'Unblock',
          iconUri: icons?.iconUri,
          iconBase64: icons?.iconBase64,
        };
      }),
    [appIcons, blockRules, unblockingPackage],
  );

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand.tealLight} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : child ? (
        <>
          <View style={styles.heroCard}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: avatar?.background ?? colors.background.accentStrong },
              ]}>
              {child?.avatarUrl ? (
                <Image source={{ uri: child.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarEmoji}>
                  {avatar?.emoji ?? displayName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.heroName}>{displayName}</Text>
            <View style={styles.detailsGrid}>
              {/* <View style={styles.detailsRow}>
                <DetailRow label="First name" value={child.firstName ?? '—'} />
                <DetailRow label="Last name" value={child.lastName ?? '—'} />
              </View> */}
              <View style={styles.detailsRow}>
                <DetailRow
                  label="Age"
                  value={
                    child.age != null ? `${child.age} years old` : '—'
                  }
                />
                <DetailRow
                  label="Linked on"
                  value={formatLinkedDate(child.createdAt)}
                />
              </View>
            </View>
          </View>

          {/* <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reconnect device</Text>
            {reconnectSession ? (
              <>
                <View style={styles.qrCard}>
                  <QRCode
                    backgroundColor={colors.background.primary}
                    color={colors.text.primary}
                    size={200}
                    value={buildPairingQrValue(reconnectSession.token)}
                  />
                </View>
                <Text style={styles.reconnectStatus}>
                  Waiting for {displayName}&apos;s device to scan this code…
                </Text>
                <Text style={styles.syncMeta}>{reconnectExpiryLabel}</Text>
                <AuthButton
                  onPress={() => setReconnectSession(null)}
                  title="Hide code"
                  variant="secondary"
                />
              </>
            ) : (
              <AuthButton
                loading={reconnectLoading}
                onPress={() => void startReconnect()}
                title="Generate reconnect code"
                variant="secondary"
              />
            )}

            {reconnectError ? (
              <Text style={styles.errorText}>{reconnectError}</Text>
            ) : null}
          </View> */}

          <View style={styles.section}>
            {blockRules.length === 0 ? (
              <>
                <View style={styles.blockedHeaderRow}>
                  <Text style={styles.sectionTitle}>Blocked apps</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleManageBlocks}
                    style={({ pressed }) => [
                      styles.manageBlockedButton,
                      pressed && styles.manageBlockedButtonPressed,
                    ]}>
                    <Text numberOfLines={1} style={styles.manageBlockedText}>
                      Block apps
                    </Text>
                  </Pressable>
                </View>
                <InfoTipCard message="No apps are blocked for this child yet. Block apps from Controls or tap the button above." />
              </>
            ) : (
              <HorizontalAppsStrip
                countLabel={`${blockRules.length} blocked`}
                headerRight={
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleManageBlocks}
                    style={({ pressed }) => [
                      styles.manageBlockedButton,
                      pressed && styles.manageBlockedButtonPressed,
                    ]}>
                    <Text numberOfLines={1} style={styles.manageBlockedText}>
                      Manage apps
                    </Text>
                  </Pressable>
                }
                items={blockedAppItems}
                onPressItem={item => {
                  const rule = blockRules.find(
                    candidate => candidate.packageName === item.packageName,
                  );
                  if (rule && unblockingPackage !== rule.packageName) {
                    handleUnblock(rule);
                  }
                }}
                title="Blocked apps"
              />
            )}
          </View>

          <View style={styles.dangerSection}>
            <Text style={styles.dangerTitle}>Delete child account</Text>
            <Text style={styles.dangerBody}>
              Deleting this child removes their login, blocked apps, and synced
              device data. This cannot be undone.
            </Text>
            <AuthButton
              loading={deleting}
              onPress={handleDeleteChild}
              title="Delete child account"
              variant="secondary"
            />
          </View>
        </>
      ) : null}
    </ScreenLayout>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createDetailRowStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text numberOfLines={2} style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

function createDetailRowStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: {
      flex: 1,
      gap: spacing.xs,
      minWidth: 0,
    },
    label: {
      ...typography.caption,
      color: colors.text.secondary,
      fontWeight: '600',
    },
    value: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
  });
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 160,
      paddingVertical: spacing.xl,
    },
    errorText: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
    },
    heroCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.xl,
    },
    avatar: {
      alignSelf: 'center',
      alignItems: 'center',
      borderRadius: radii.pill,
      height: 88,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 88,
    },
    avatarImage: {
      height: 88,
      width: 88,
    },
    avatarEmoji: {
      fontSize: 40,
    },
    heroName: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 24,
      textAlign: 'center',
    },
    heroEmail: {
      ...typography.body,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    detailsGrid: {
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    detailsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.label,
      color: colors.text.primary,
      flexShrink: 1,
      fontSize: 18,
      marginRight: spacing.sm,
    },
    blockedHeaderRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    manageBlockedButton: {
      alignItems: 'center',
      borderColor: colors.brand.teal,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      height: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      width: '50%',
    },
    manageBlockedButtonPressed: {
      opacity: 0.85,
    },
    manageBlockedText: {
      ...typography.label,
      color: colors.brand.tealLight,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    syncMeta: {
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
    reconnectStatus: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
      textAlign: 'center',
    },
    dangerSection: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    dangerTitle: {
      ...typography.label,
      color: colors.error,
      fontSize: 16,
    },
    dangerBody: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
    },
  });
}
