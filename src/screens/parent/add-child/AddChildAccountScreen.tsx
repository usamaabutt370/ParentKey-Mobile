import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AuthButton,
  AuthTextInput,
  ScreenLayout,
} from '../../../components';
import { InfoTipCard, ScreenHeader } from '../../../components/parent';
import { getChildAvatar } from '../../../constants/childAvatars';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { createChildAccount } from '../../../lib/children';
import { isValidEmail } from '../../../lib/auth';
import type { ChildrenStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { radii, spacing, typography } from '../../../theme';

type Props = NativeStackScreenProps<ChildrenStackParamList, 'AddChildAccount'>;

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function AddChildAccountScreen({ navigation, route }: Props) {
  const { profile } = route.params;
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const avatar = getChildAvatar(profile.avatarId);
  const displayName = `${profile.firstName} ${profile.lastName}`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(current =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  };

  const validate = () => {
    const errors: FieldErrors = {};

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
      errors.confirmPassword = 'Please confirm the password.';
    } else if (password && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateChild = async () => {
    setFormError(null);

    if (!validate()) {
      return;
    }

    if (!session) {
      setFormError('Your session expired. Please sign in again.');
      return;
    }

    setLoading(true);

    const result = await createChildAccount({
      parentSession: session,
      profile,
      email,
      password,
    });

    setLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    navigation.navigate('AddChildSuccess', {
      profile,
      email: email.trim().toLowerCase(),
    });
  };

  return (
    <ScreenLayout
      keyboardAvoiding
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        stepLabel="Step 2 of 2"
        subtitle="Create login credentials for their device"
        title="Account setup"
      />

      <View style={styles.summaryCard}>
        {avatar ? (
          <View style={[styles.avatar, { backgroundColor: avatar.background }]}>
            <Text style={styles.emoji}>{avatar.emoji}</Text>
          </View>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.initials}>
              {profile.firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryName}>{displayName}</Text>
          {profile.age ? (
            <Text style={styles.summaryMeta}>{profile.age} years old</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.form}>
        <AuthTextInput
          autoComplete="email"
          error={fieldErrors.email}
          keyboardType="email-address"
          label="Child email"
          onChangeText={text => {
            setEmail(text);
            clearFieldError('email');
          }}
          placeholder="child@example.com"
          textContentType="emailAddress"
          value={email}
        />
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
        <AuthTextInput
          autoComplete="password-new"
          error={fieldErrors.confirmPassword}
          label="Confirm password"
          onChangeText={text => {
            setConfirmPassword(text);
            clearFieldError('confirmPassword');
          }}
          placeholder="Re-enter password"
          secureTextEntry
          textContentType="newPassword"
          value={confirmPassword}
        />
      </View>

      <InfoTipCard message="Your child will use this email and password to sign in on their device with the Child role selected." />

      <View style={styles.footer}>
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}
        <AuthButton
          loading={loading}
          onPress={handleCreateChild}
          title="Create child account"
        />
        <Text style={styles.backLink} onPress={() => navigation.goBack()}>
          Back
        </Text>
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
    },
    summaryCard: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: radii.pill,
      height: 56,
      justifyContent: 'center',
      width: 56,
    },
    emoji: {
      fontSize: 28,
    },
    initials: {
      ...typography.label,
      color: colors.text.brand,
      fontSize: 22,
    },
    summaryInfo: {
      flex: 1,
      gap: spacing.xs,
    },
    summaryName: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
    },
    summaryMeta: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    form: {
      gap: spacing.md,
    },
    footer: {
      gap: spacing.md,
      marginTop: 'auto',
      paddingBottom: spacing.sm,
    },
    formError: {
      color: colors.error,
      fontSize: 14,
      textAlign: 'center',
    },
    backLink: {
      color: colors.text.brand,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
