import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AuthButton,
  AuthTextInput,
  ScreenLayout,
  Spacer,
} from '../components';
import { InfoTipCard } from '../components/parent';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isValidEmail } from '../lib/auth';
import type { AuthStackParamList } from '../navigation/types';
import type { ColorPalette } from '../theme/colors';
import { spacing, typography } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  React.useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendCooldown(current => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const submitResetRequest = async (targetEmail: string) => {
    setFormError(null);

    if (!targetEmail.trim()) {
      setEmailError('Email is required.');
      return;
    }

    if (!isValidEmail(targetEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailError(undefined);
    setLoading(true);

    const result = await requestPasswordReset(targetEmail);
    setLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    setSubmittedEmail(targetEmail.trim().toLowerCase());
    setEmailSent(true);
    startResendCooldown();
  };

  const handleSubmit = async () => {
    await submitResetRequest(email);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !submittedEmail) {
      return;
    }

    await submitResetRequest(submittedEmail);
  };

  return (
    <ScreenLayout keyboardAvoiding scrollable>
      <View style={styles.header}>
        <Text style={styles.brand}>ParentKey</Text>
        <Spacer.Column numberOfSpaces={14} />
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          {emailSent
            ? 'Check your inbox for a link to choose a new password.'
            : 'Enter the email for your account and we will send a reset link.'}
        </Text>
      </View>

      <InfoTipCard message="Use the same email you signed up with in ParentKey. Supabase only sends reset emails to registered accounts." />

      {emailSent ? (
        <View style={styles.successBlock}>
          <Text style={styles.successText}>
            If an account exists for {submittedEmail}, a reset email was
            requested. Open the link on this device to set a new password.
          </Text>
          <View style={styles.checklist}>
            <Text style={styles.checklistTitle}>Email not arriving?</Text>
            <Text style={styles.checklistItem}>
              1. Check spam/junk for mail from Supabase.
            </Text>
            <Text style={styles.checklistItem}>
              2. In Supabase → Authentication → URL Configuration, add{' '}
              <Text style={styles.inlineCode}>parentkey://reset-password</Text>{' '}
              to Redirect URLs (or use wildcard{' '}
              <Text style={styles.inlineCode}>parentkey://**</Text>).
            </Text>
            <Text style={styles.checklistItem}>
              3. In Supabase → Authentication → Users, confirm this email
              exists.
            </Text>
            <Text style={styles.checklistItem}>
              4. Free Supabase projects limit auth emails (~2/hour). Wait and try
              resend, or configure custom SMTP.
            </Text>
            <Text style={styles.checklistItem}>
              5. Check Supabase → Authentication → Logs for send failures.
            </Text>
          </View>
          <AuthButton
            disabled={resendCooldown > 0 || loading}
            loading={loading}
            onPress={() => void handleResend()}
            title={
              resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend reset email'
            }
            variant="secondary"
          />
          <AuthButton
            onPress={() => navigation.navigate('Login')}
            title="Back to log in"
          />
        </View>
      ) : (
        <View>
          <AuthTextInput
            autoComplete="email"
            autoFocus
            error={emailError}
            keyboardType="email-address"
            label="Email"
            onChangeText={text => {
              setEmail(text);
              setEmailError(undefined);
            }}
            placeholder="you@example.com"
            textContentType="emailAddress"
            value={email}
          />
          <Spacer.Column numberOfSpaces={12} />
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <AuthButton
            loading={loading}
            onPress={() => void handleSubmit()}
            title="Send reset link"
          />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Remember your password?{' '}
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
    successBlock: {
      gap: spacing.md,
    },
    successText: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
      textAlign: 'center',
    },
    checklist: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: spacing.sm,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    checklistTitle: {
      ...typography.label,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    checklistItem: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    inlineCode: {
      color: colors.text.brand,
      fontFamily: 'Menlo',
      fontSize: 12,
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
