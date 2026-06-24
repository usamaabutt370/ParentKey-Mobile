import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthButton, ScreenLayout, useScreenStyles } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { USER_ROLE_LABELS } from '../../types/auth';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

const SETTINGS_ITEMS = [
  { id: 'notifications', label: 'Notifications', description: 'Alerts and limit warnings' },
  { id: 'subscription', label: 'Subscription', description: 'Manage your plan' },
  { id: 'permissions', label: 'Permissions', description: 'Device and app access' },
  { id: 'help', label: 'Help & support', description: 'FAQs and contact' },
];

export function ParentSettingsScreen() {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session, signOut } = useAuth();
  const firstName = session?.user.user_metadata?.first_name;
  const lastName = session?.user.user_metadata?.last_name;
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') || 'Parent account';

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

      <View style={styles.menu}>
        {SETTINGS_ITEMS.map(item => (
          <View key={item.id} style={styles.menuItem}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDescription}>{item.description}</Text>
          </View>
        ))}
      </View>

      <AuthButton onPress={signOut} title="Sign out" variant="secondary" />
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
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
  });
}
