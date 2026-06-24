import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CHILD_AVATARS } from '../../constants/childAvatars';
import { useTheme } from '../../context/ThemeContext';
import type { ChildAvatarId } from '../../types/child';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type AvatarPickerProps = {
  label?: string;
  value?: ChildAvatarId;
  onChange: (avatarId: ChildAvatarId) => void;
};

export function AvatarPicker({
  label = 'Choose an avatar',
  value,
  onChange,
}: AvatarPickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.grid}>
        {CHILD_AVATARS.map(avatar => {
          const isSelected = value === avatar.id;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={avatar.id}
              onPress={() => onChange(avatar.id)}
              style={[
                styles.avatarButton,
                { backgroundColor: avatar.background },
                isSelected && styles.avatarButtonSelected,
              ]}>
              <Text style={styles.emoji}>{avatar.emoji}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
    },
    label: {
      ...typography.label,
      color: colors.text.secondary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    avatarButton: {
      alignItems: 'center',
      borderColor: 'transparent',
      borderRadius: radii.pill,
      borderWidth: 2,
      height: 56,
      justifyContent: 'center',
      width: 56,
    },
    avatarButtonSelected: {
      borderColor: colors.brand.tealLight,
    },
    emoji: {
      fontSize: 28,
    },
  });
}
