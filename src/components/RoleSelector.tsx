import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import {
  USER_ROLE_LABELS,
  USER_ROLES,
  type UserRole,
} from '../types/auth';
import type { ColorPalette } from '../theme/colors';
import { radii, typography } from '../theme';

const GRADIENT_START = { x: 0, y: 0.5 };
const GRADIENT_END = { x: 1, y: 0.5 };
const BORDER_WIDTH = 1.5;
const BUTTON_HEIGHT = 48;

type RoleSelectorProps = {
  label?: string;
  value: UserRole;
  onChange: (role: UserRole) => void;
  error?: string;
};

export function RoleSelector({
  value,
  onChange,
  error,
}: RoleSelectorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const gradientColors = [
    colors.button.gradientStart,
    colors.button.gradientEnd,
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.options}>
        {USER_ROLES.map(role => {
          const isSelected = value === role;

          return (
            <Pressable
              key={role}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(role)}
              style={({ pressed }) => [
                styles.optionWrapper,
                pressed && styles.pressed,
              ]}>
              <View
                style={[
                  styles.buttonBase,
                  !isSelected && styles.outlineButton,
                ]}>
                {isSelected ? (
                  <LinearGradient
                    colors={gradientColors}
                    end={GRADIENT_END}
                    pointerEvents="none"
                    start={GRADIENT_START}
                    style={styles.gradientFill}
                  />
                ) : null}
                <Text
                  style={isSelected ? styles.selectedText : styles.outlineText}>
                  {USER_ROLE_LABELS[role]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrapper: {
      gap: 8,
      width: '100%',
    },
    options: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    optionWrapper: {
      flex: 1,
      minWidth: 0,
    },
    pressed: {
      opacity: 0.85,
    },
    buttonBase: {
      alignItems: 'center',
      borderRadius: radii.pill,
      height: BUTTON_HEIGHT,
      justifyContent: 'center',
      overflow: 'hidden',
      paddingHorizontal: 16,
      width: '100%',
    },
    gradientFill: {
      ...StyleSheet.absoluteFill,
    },
    outlineButton: {
      backgroundColor: 'transparent',
      borderColor: colors.brand.teal,
      borderWidth: BORDER_WIDTH,
    },
    selectedText: {
      ...typography.button,
      color: colors.button.text,
      textAlign: 'center',
    },
    outlineText: {
      ...typography.button,
      color: colors.brand.tealLight,
      textAlign: 'center',
    },
    error: {
      ...typography.caption,
      color: colors.error,
    },
  });
}
