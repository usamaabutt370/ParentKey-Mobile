import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { getChildAvatar } from '../../constants/childAvatars';
import { useTheme } from '../../context/ThemeContext';
import { getChildDisplayName } from '../../lib/children';
import type { ChildProfile } from '../../types/child';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type ChildCardProps = {
  child: ChildProfile;
  onPress?: () => void;
  screenTimeToday?: string;
  deviceStatus?: 'online' | 'offline' | 'never';
};

export function ChildCard({
  child,
  onPress,
  screenTimeToday,
  deviceStatus,
}: ChildCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const avatar = getChildAvatar(child.avatarId ?? undefined);
  const displayName = getChildDisplayName(child);
  const subtitle = child.email ?? 'Linked account';
  const meta = screenTimeToday
    ? `${screenTimeToday} today`
    : child.age != null
      ? `${child.age} years old`
      : 'Account linked';
  const statusColor =
    deviceStatus === 'online'
      ? colors.success
      : deviceStatus === 'offline'
        ? colors.error
        : colors.text.brand;

  const content = (
    <>
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: avatar?.background ?? colors.background.accentStrong },
          ]}>
          <Text style={styles.avatarText}>
            {avatar?.emoji ?? displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.metaColumn}>
          <Text style={[styles.meta, deviceStatus ? { color: statusColor } : null]}>
            {meta}
          </Text>
          {onPress ? (
            <Feather color={colors.text.placeholder} name="chevron-right" size={18} />
          ) : null}
        </View>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.md,
    },
    cardPressed: {
      opacity: 0.88,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
    },
    avatar: {
      alignItems: 'center',
      borderRadius: radii.pill,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    avatarText: {
      fontSize: 22,
    },
    info: {
      flex: 1,
      gap: spacing.xs,
    },
    name: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    subtitle: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    metaColumn: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    meta: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '600',
    },
  });
}
