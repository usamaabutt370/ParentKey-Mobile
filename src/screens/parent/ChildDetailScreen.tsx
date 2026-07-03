import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  BlockedAppRow,
  InfoTipCard,
  ScreenHeader,
} from '../../components/parent';
import { AuthButton, ScreenLayout } from '../../components';
import { getChildAvatar } from '../../constants/childAvatars';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  fetchChildBlockRules,
  removeChildBlockRule,
  type AppBlockRule,
} from '../../lib/appRules';
import { fetchChildById, getChildDisplayName } from '../../lib/children';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingPackage, setUnblockingPackage] = useState<string | null>(
    null,
  );

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

    const [childResult, rulesResult] = await Promise.all([
      fetchChildById(parentId, childId),
      fetchChildBlockRules(childId),
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

    setLoading(false);
  }, [childId, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadChild();
    }, [loadChild]),
  );

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

  const avatar = getChildAvatar(child?.avatarId ?? undefined);
  const displayName = child ? getChildDisplayName(child) : 'Child';

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        subtitle="Profile and account details"
        title={displayName}
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
              <Text style={styles.avatarEmoji}>
                {avatar?.emoji ?? displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.heroName}>{displayName}</Text>
            {child.email ? (
              <Text style={styles.heroEmail}>{child.email}</Text>
            ) : null}
          </View>

          <View style={styles.detailsCard}>
            <DetailRow label="First name" value={child.firstName ?? '—'} />
            <View style={styles.divider} />
            <DetailRow label="Last name" value={child.lastName ?? '—'} />
            <View style={styles.divider} />
            <DetailRow
              label="Age"
              value={child.age != null ? `${child.age} years old` : '—'}
            />
            <View style={styles.divider} />
            <DetailRow label="Linked on" value={formatLinkedDate(child.createdAt)} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Blocked apps</Text>
            {blockRules.length === 0 ? (
              <InfoTipCard message="No apps are blocked for this child yet. Block apps from Controls or tap the button below." />
            ) : (
              <View style={styles.blockedList}>
                {blockRules.map(rule => (
                  <BlockedAppRow
                    key={rule.id}
                    onUnblock={() => handleUnblock(rule)}
                    rule={rule}
                    unblocking={unblockingPackage === rule.packageName}
                  />
                ))}
              </View>
            )}
            <AuthButton
              onPress={handleManageBlocks}
              title={
                blockRules.length === 0 ? 'Block apps' : 'Manage blocked apps'
              }
              variant={blockRules.length === 0 ? 'primary' : 'secondary'}
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
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function createDetailRowStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: {
      gap: spacing.xs,
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
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.xl,
    },
    avatar: {
      alignItems: 'center',
      borderRadius: radii.pill,
      height: 88,
      justifyContent: 'center',
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
    detailsCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    divider: {
      backgroundColor: colors.border.default,
      height: StyleSheet.hairlineWidth,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
    },
    blockedList: {
      gap: spacing.sm,
    },
  });
}
