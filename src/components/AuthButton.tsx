import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { ColorPalette } from '../theme/colors';
import { radii, typography } from '../theme';

const BUTTON_HEIGHT = 52;

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
  const isPrimary = variant === 'primary';

  return (
    <View style={[styles.container, isPrimary && styles.primaryShadow]}>
      <Pressable
        {...props}
        accessibilityRole="button"
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.button,
          isPrimary ? styles.primaryButton : styles.secondary,
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.disabled,
          style as StyleProp<ViewStyle>,
        ]}>
        {isPrimary ? (
          <LinearGradient
            colors={[colors.button.gradientStart, colors.button.gradientEnd]}
            end={{ x: 1, y: 0.5 }}
            pointerEvents="none"
            start={{ x: 0, y: 0.5 }}
            style={styles.gradient}
          />
        ) : null}
        {loading ? (
          <ActivityIndicator
            color={isPrimary ? colors.button.text : colors.brand.tealLight}
          />
        ) : (
          <Text
            style={[
              styles.label,
              isPrimary ? styles.primaryLabel : styles.secondaryLabel,
            ]}>
            {title}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      alignSelf: 'stretch',
      width: '100%',
    },
    primaryShadow: {
      elevation: 6,
      shadowColor: colors.button.glow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
    },
    button: {
      alignItems: 'center',
      borderRadius: radii.pill,
      height: BUTTON_HEIGHT,
      justifyContent: 'center',
      overflow: 'hidden',
      paddingHorizontal: 24,
      width: '100%',
    },
    primaryButton: {
      backgroundColor: colors.button.gradientStart,
    },
    gradient: {
      ...StyleSheet.absoluteFill,
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
      lineHeight: 22,
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
