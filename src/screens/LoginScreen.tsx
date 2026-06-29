import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AuthButton,
  AuthTextInput,
  ScreenLayout,
  Spacer,
} from '../components';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { AuthStackParamList } from '../navigation/types';
import type { ColorPalette } from '../theme/colors';
import { spacing, typography } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

type FieldErrors = {
  email?: string;
  password?: string;
};

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    if (!email.trim()) {
      errors.email = 'Email is required.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setFormError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    const message = await signIn({ email, password });
    setLoading(false);

    if (message) {
      setFormError(message);
    }
  };

  return (
    <ScreenLayout keyboardAvoiding scrollable>
      <View style={styles.header}>
        <Text style={styles.brand}>ParentKey</Text>
        <Spacer.Column numberOfSpaces={14} />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to continue to ParentKey
        </Text>
      </View>

      <View>
        <AuthTextInput
          autoComplete="email"
          error={fieldErrors.email}
          keyboardType="email-address"
          label="Email"
          onChangeText={text => {
            setEmail(text);
            clearFieldError('email');
          }}
          placeholder="you@example.com"
          textContentType="emailAddress"
          value={email}
        />
        <Spacer.Column numberOfSpaces={8} />
        <AuthTextInput
          autoComplete="password"
          error={fieldErrors.password}
          label="Password"
          onChangeText={text => {
            setPassword(text);
            clearFieldError('password');
          }}
          placeholder="Your password"
          secureTextEntry
          textContentType="password"
          value={password}
        />
        <Spacer.Column numberOfSpaces={4} />
        <Text
          style={styles.forgotPasswordLink}
          onPress={() => navigation.navigate('ForgotPassword')}>
          Forgot password?
        </Text>
        <Spacer.Column numberOfSpaces={12} />
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <AuthButton loading={loading} onPress={handleLogin} title="Log in" />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Don't have an account?{' '}
          <Text
            style={styles.footerLink}
            onPress={() => navigation.navigate('Signup')}>
            Sign up
          </Text>
        </Text>
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
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    color: colors.text.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    gap: spacing.md,
    marginTop: 'auto',
    paddingBottom: spacing.sm,
  },
  footerText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.text.brand,
    fontWeight: '600',
  },
  });
}
