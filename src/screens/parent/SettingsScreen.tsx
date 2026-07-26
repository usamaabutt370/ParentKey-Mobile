import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthButton, ScreenLayout, useScreenStyles } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { deleteOwnAccount } from '../../lib/account';
import { USER_ROLE_LABELS } from '../../types/auth';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

/** Matches ParentTabNavigator tab bar content height (excluding safe-area inset). */
const TAB_BAR_CONTENT_HEIGHT = 56;

const SETTINGS_ITEMS = [
  { id: 'notifications', label: 'Notifications', description: 'Alerts and limit warnings' },
  { id: 'subscription', label: 'Subscription', description: 'Manage your plan' },
  { id: 'permissions', label: 'Permissions', description: 'Device and app access' },
  { id: 'help', label: 'Help & support', description: 'FAQs and contact' },
];

export function ParentSettingsScreen() {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.bottom),
    [colors, insets.bottom],
  );
  const { session, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const firstName = session?.user.user_metadata?.first_name;
  const lastName = session?.user.user_metadata?.last_name;
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') || 'Parent account';

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your parent account and all linked child accounts, blocked apps, and synced device data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);

              const result = await deleteOwnAccount();

              if (!result.ok) {
                setDeleting(false);
                Alert.alert('Could not delete account', result.message);
                return;
              }

              await signOut();
              setDeleting(false);
            })();
          },
        },
      ],
    );
  };

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Settings</Text>
        <Text style={screenStyles.subtitle}>Account and app preferences</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(firstName?.charAt(0) ?? session?.user.email?.charAt(0) ?? 'P').toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileMeta}>
            {USER_ROLE_LABELS.parent} · {session?.user.email}
          </Text>
        </View>
      </View>

      <AuthButton onPress={signOut} title="Sign out" variant="secondary" />

      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Danger zone</Text>
        <Text style={styles.dangerBody}>
          Deleting your account removes your login and every linked child
          account. This cannot be undone.
        </Text>
        <AuthButton
          loading={deleting}
          onPress={handleDeleteAccount}
          title="Delete account"
          variant="secondary"
        />
      </View>

      <View style={styles.menu}>
        {SETTINGS_ITEMS.map(item => (
          <View key={item.id} style={styles.menuItem}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDescription}>{item.description}</Text>
          </View>
        ))}
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette, bottomInset: number) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
      // Clear the bottom tab bar so Delete account stays reachable.
      paddingBottom: TAB_BAR_CONTENT_HEIGHT + bottomInset + spacing.xl,
    },
    profileCard: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: radii.pill,
      height: 52,
      justifyContent: 'center',
      width: 52,
    },
    avatarText: {
      ...typography.label,
      color: colors.text.brand,
      fontSize: 20,
    },
    profileInfo: {
      flex: 1,
      gap: spacing.xs,
    },
    profileName: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
    },
    profileMeta: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    menu: {
      gap: spacing.sm,
    },
    menuItem: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    menuLabel: {
      ...typography.label,
      color: colors.text.primary,
    },
    menuDescription: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    dangerSection: {
      gap: spacing.sm,
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
