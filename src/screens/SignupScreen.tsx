import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AuthButton,
  AuthTextInput,
  RoleSelector,
  ScreenLayout,
  Spacer,
} from '../components';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isValidEmail } from '../lib/auth';
import type { AuthStackParamList } from '../navigation/types';
import type { UserRole } from '../types/auth';
import type { ColorPalette } from '../theme/colors';
import {  spacing, typography } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function SignupScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signUp } = useAuth();
  const [role, setRole] = useState<UserRole>(route.params?.role ?? 'parent');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.role) {
      setRole(route.params.role);
    }
  }, [route.params?.role]);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(current =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  };

  const validate = () => {
    const errors: FieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = 'First name is required.';
    }

    if (!lastName.trim()) {
      errors.lastName = 'Last name is required.';
    }

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }

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

  const handleSignup = async () => {
    setFormError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    const result = await signUp({
      email,
      password,
      firstName,
      lastName,
      role,
    });
    setLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    // Session is created immediately — RootNavigator routes to the home screen.
  };

  return (
    <ScreenLayout keyboardAvoiding scrollable>
      <View style={styles.header}>
        <Text style={styles.brand}>ParentKey</Text>
        <Spacer.Column numberOfSpaces={14} />
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Sign up with your email to get started
        </Text>
      </View>

      <View>
        <RoleSelector onChange={setRole} value={role} />
        <Spacer.Column numberOfSpaces={8} />
        <AuthTextInput
          autoCapitalize="words"
          autoComplete="name-given"
          error={fieldErrors.firstName}
          label="First name"
          onChangeText={text => {
            setFirstName(text);
            clearFieldError('firstName');
          }}
          placeholder="First name"
          textContentType="givenName"
          value={firstName}
        />
        <Spacer.Column numberOfSpaces={5} />
        <AuthTextInput
          autoCapitalize="words"
          autoComplete="name-family"
          error={fieldErrors.lastName}
          label="Last name"
          onChangeText={text => {
            setLastName(text);
            clearFieldError('lastName');
          }}
          placeholder="Last name"
          textContentType="familyName"
          value={lastName}
        />
        <Spacer.Column numberOfSpaces={5} />
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
        <Spacer.Column numberOfSpaces={5} />
        <AuthTextInput
          autoComplete="password-new"
          error={fieldErrors.password}
          label="Password"
          onChangeText={text => {
            setPassword(text);
            clearFieldError('password');
          }}
          placeholder="At least 6 characters"
          secureTextEntry
          textContentType="newPassword"
          value={password}
        />
        <Spacer.Column numberOfSpaces={5} />
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
        <AuthButton loading={loading} onPress={handleSignup} title="Sign up" />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Text
            style={styles.footerLink}
            onPress={() => navigation.navigate('Login')}>
            Log in
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
