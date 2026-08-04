import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { getChildAvatar } from '../../constants/childAvatars';
import { useTheme } from '../../context/ThemeContext';
import { getChildDisplayName } from '../../lib/children';
import type { ChildProfile } from '../../types/child';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = {
  child: ChildProfile | null;
  onPress: () => void;
  disabled?: boolean;
};

export function ChildSelectorChip({ child, onPress, disabled }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const displayName = child ? getChildDisplayName(child) : 'Select child';
  const avatar = getChildAvatar(child?.avatarId ?? undefined);
  const photoUrl = child?.avatarUrl?.trim() || null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Selected child ${displayName}. Change child.`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
        disabled && styles.chipDisabled,
      ]}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: avatar?.background ?? colors.background.accentStrong,
          },
        ]}>
        {photoUrl ? (
          <Image
            resizeMode="cover"
            source={{ uri: photoUrl }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={styles.avatarText}>
            {avatar?.emoji ?? displayName.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <Text numberOfLines={1} style={styles.name}>
        {displayName}
      </Text>
      <Feather color={colors.text.brand} name="chevron-down" size={16} />
    </Pressable>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    chip: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.pill,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      maxWidth: '100%',
      flexShrink: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
    },
    chipPressed: {
      opacity: 0.85,
    },
    chipDisabled: {
      opacity: 0.55,
    },
    avatar: {
      alignItems: 'center',
      borderRadius: 14,
      height: 28,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 28,
    },
    avatarImage: {
      height: 28,
      width: 28,
    },
    avatarText: {
      fontSize: 14,
    },
    name: {
      ...typography.label,
      color: colors.text.primary,
      flexShrink: 1,
      fontSize: 15,
    },
  });
}
