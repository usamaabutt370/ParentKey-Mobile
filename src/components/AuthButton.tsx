import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { ColorPalette } from '../theme/colors';
import { radii, typography } from '../theme';

type AuthButtonProps = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function AuthButton({
  title,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...props
}: AuthButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  if (variant === 'secondary') {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.button,
          styles.secondary,
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.disabled,
          style as StyleProp<ViewStyle>,
        ]}
        {...props}>
        {loading ? (
          <ActivityIndicator color={colors.brand.tealLight} />
        ) : (
          <Text style={[styles.label, styles.secondaryLabel]}>{title}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.primaryOuter,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style as StyleProp<ViewStyle>,
      ]}
      {...props}>
      <LinearGradient
        colors={[colors.button.gradientStart, colors.button.gradientEnd]}
        end={{ x: 1, y: 0.5 }}
        start={{ x: 0, y: 0.5 }}
        style={styles.button}>
        {loading ? (
          <ActivityIndicator color={colors.button.text} />
        ) : (
          <Text style={[styles.label, styles.primaryLabel]}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    button: {
      alignItems: 'center',
      borderRadius: radii.pill,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    primaryOuter: {
      borderRadius: radii.pill,
      elevation: 6,
      overflow: 'hidden',
      shadowColor: colors.button.glow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: colors.brand.teal,
      borderWidth: 1.5,
    },
    pressed: {
      opacity: 0.85,
    },
    disabled: {
      opacity: 0.55,
    },
    label: {
      ...typography.button,
      textAlign: 'center',
    },
    primaryLabel: {
      color: colors.button.text,
    },
    secondaryLabel: {
      color: colors.brand.tealLight,
    },
  });
}
