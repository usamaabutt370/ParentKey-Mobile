import React, { useState } from 'react';
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
import { colors, radii, typography } from '../theme';

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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = secureTextEntry === true;
  const hidePassword = isPasswordField && !isPasswordVisible;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          autoCapitalize="none"
          placeholderTextColor={colors.text.placeholder}
          secureTextEntry={hidePassword}
          style={[
            styles.input,
            isPasswordField && styles.inputWithIcon,
            error ? styles.inputError : null,
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

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.input.background,
    borderColor: colors.input.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.input.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  inputError: {
    borderColor: colors.error,
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
