import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AuthButton,
  AuthTextInput,
  ScreenLayout,
  Spacer,
} from '../components';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ColorPalette } from '../theme/colors';
import { spacing, typography } from '../theme';

type FieldErrors = {
  password?: string;
  confirmPassword?: string;
};

export function ResetPasswordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { updatePassword, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(current =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  };

  const validate = () => {
    const errors: FieldErrors = {};

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    const result = await updatePassword(password);
    setLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    clearPasswordRecovery();
  };

  return (
    <ScreenLayout keyboardAvoiding scrollable>
      <View style={styles.header}>
        <Text style={styles.brand}>ParentKey</Text>
        <Spacer.Column numberOfSpaces={14} />
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.subtitle}>
          Enter and confirm your new password to finish resetting your account.
        </Text>
      </View>

      <View>
        <AuthTextInput
          autoComplete="password-new"
          error={fieldErrors.password}
          label="New password"
          onChangeText={text => {
            setPassword(text);
            clearFieldError('password');
          }}
          placeholder="At least 6 characters"
          secureTextEntry
          textContentType="newPassword"
          value={password}
        />
        <Spacer.Column numberOfSpaces={8} />
        <AuthTextInput
          autoComplete="password-new"
          error={fieldErrors.confirmPassword}
          label="Confirm password"
          onChangeText={text => {
            setConfirmPassword(text);
            clearFieldError('confirmPassword');
          }}
          placeholder="Re-enter your password"
          secureTextEntry
          textContentType="newPassword"
          value={confirmPassword}
        />
        <Spacer.Column numberOfSpaces={12} />
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <AuthButton
          loading={loading}
          onPress={() => void handleSubmit()}
          title="Update password"
        />
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    header: {
      gap: spacing.sm,
    },
    brand: {
      color: colors.text.brand,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
    },
    formError: {
      color: colors.error,
      fontSize: 14,
      textAlign: 'center',
    },
  });
}
