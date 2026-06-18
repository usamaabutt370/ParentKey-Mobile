import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { icons } from '../assets';
import { useTheme } from '../context/ThemeContext';
import type { ColorPalette } from '../theme/colors';
import { radii, typography } from '../theme';

type AuthTextInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthTextInput({
  label,
  error,
  secureTextEntry,
  style,
  ...props
}: AuthTextInputProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = secureTextEntry === true;
  const hidePassword = isPasswordField && !isPasswordVisible;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputContainerError : null,
        ]}>
        <TextInput
          autoCapitalize="none"
          placeholderTextColor={colors.text.placeholder}
          secureTextEntry={hidePassword}
          style={[
            styles.input,
            isPasswordField && styles.inputWithIcon,
            style,
          ]}
          {...props}
        />
        {isPasswordField ? (
          <Pressable
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsPasswordVisible(current => !current)}
            style={styles.iconButton}>
            <Image
              resizeMode="contain"
              source={isPasswordVisible ? icons.eyeVisible : icons.eyeHidden}
              style={styles.icon}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    wrapper: {
      gap: 8,
    },
    label: {
      ...typography.label,
      color: colors.text.secondary,
    },
    inputContainer: {
      backgroundColor: colors.input.background,
      borderColor: colors.input.border,
      borderRadius: radii.md,
      borderWidth: 1,
      elevation: isDark ? 5 : 4,
      minHeight: 52,
      position: 'relative',
      shadowColor: colors.input.shadow,
      shadowOffset: { width: 0, height: isDark ? 4 : 3 },
      shadowOpacity: isDark ? 0.35 : 0.18,
      shadowRadius: isDark ? 10 : 8,
    },
    inputContainerError: {
      borderColor: colors.error,
      shadowColor: colors.error,
      shadowOpacity: isDark ? 0.25 : 0.12,
    },
    input: {
      backgroundColor: 'transparent',
      color: colors.input.text,
      fontSize: 16,
      minHeight: 52,
      paddingHorizontal: 16,
    },
    inputWithIcon: {
      paddingRight: 48,
    },
    iconButton: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      position: 'absolute',
      right: 16,
      top: 0,
      width: 24,
    },
    icon: {
      height: 20,
      tintColor: colors.text.secondary,
      width: 20,
    },
    error: {
      ...typography.caption,
      color: colors.error,
    },
  });
}
