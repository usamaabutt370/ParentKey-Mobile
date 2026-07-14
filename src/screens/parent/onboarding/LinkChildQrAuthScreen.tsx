import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {
  AuthButton,
  AuthTextInput,
  ScreenBackground,
  Spacer,
} from '../../../components';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { isValidEmail } from '../../../lib/auth';
import { setPendingLinkChild, setPreAuthSetupRoute } from '../../../lib/pendingParentAction';
import type { AuthStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { radii, spacing, typography } from '../../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'LinkChildQrAuth'>;

type AuthMode = 'login' | 'signup';

type LoginErrors = {
  email?: string;
  password?: string;
};

type SignupErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const SHEET_HEIGHT = Dimensions.get('window').height * 0.85;

export function LinkChildQrAuthScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signIn, signUp } = useAuth();

  const [authVisible, setAuthVisible] = useState(true);
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupErrors, setSignupErrors] = useState<SignupErrors>({});

  useEffect(() => {
    setPendingLinkChild().catch(() => undefined);
    setPreAuthSetupRoute('LinkChildQrAuth').catch(() => undefined);
  }, []);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setFormError(null);
  };

  const validateLogin = () => {
    const errors: LoginErrors = {};
    if (!email.trim()) {
      errors.email = 'Email is required.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignup = () => {
    const errors: SignupErrors = {};
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
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    setSignupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAuthSuccess = () => {
    // Reveal the QR stage under the sheet; RootNavigator remounts into the
    // real pairing QR once the session is active.
    setAuthVisible(false);
  };

  const handleLogin = async () => {
    setFormError(null);
    if (!validateLogin()) {
      return;
    }

    setLoading(true);
    await setPendingLinkChild();
    const message = await signIn({ email, password });
    setLoading(false);

    if (message) {
      setFormError(message);
      return;
    }

    handleAuthSuccess();
  };

  const handleSignup = async () => {
    setFormError(null);
    if (!validateSignup()) {
      return;
    }

    setLoading(true);
    await setPendingLinkChild();
    const result = await signUp({
      email,
      password,
      firstName,
      lastName,
    });
    setLoading(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    handleAuthSuccess();
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
        <View style={styles.qrStage}>
          <Text style={styles.stageEyebrow}>STEP 3 OF 4</Text>
          <Text style={styles.stageTitle}>Link with QR code</Text>
          <Text style={styles.stageSubtitle}>
            Sign in or create an account to reveal the code your child will scan.
          </Text>

          <View style={[styles.qrCard, !authVisible && styles.qrCardActive]}>
            {authVisible ? (
              <>
                <View style={styles.lockBadge}>
                  <Feather color={colors.brand.tealLight} name="lock" size={28} />
                </View>
                <Text style={styles.qrHint}>QR code locked</Text>
                <Text style={styles.qrHintSecondary}>
                  Complete login or sign up below
                </Text>
              </>
            ) : (
              <>
                <ActivityIndicator
                  color={colors.brand.tealLight}
                  size="large"
                  style={styles.loader}
                />
                <Text style={styles.qrHint}>Preparing your QR code…</Text>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>

      <Modal
        animationType="slide"
        onRequestClose={() => undefined}
        transparent
        visible={authVisible}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalScrim} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetWrap}>
            <View style={[styles.sheet, { height: SHEET_HEIGHT }]}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>
                {mode === 'login' ? 'Log in to continue' : 'Create parent account'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                After this, your linking QR code will appear on this screen.
              </Text>

              <View style={styles.segment}>
                <Pressable
                  onPress={() => switchMode('login')}
                  style={[
                    styles.segmentItem,
                    mode === 'login' && styles.segmentItemActive,
                  ]}>
                  <Text
                    style={[
                      styles.segmentLabel,
                      mode === 'login' && styles.segmentLabelActive,
                    ]}>
                    Log in
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => switchMode('signup')}
                  style={[
                    styles.segmentItem,
                    mode === 'signup' && styles.segmentItemActive,
                  ]}>
                  <Text
                    style={[
                      styles.segmentLabel,
                      mode === 'signup' && styles.segmentLabelActive,
                    ]}>
                    Sign up
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.formScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {mode === 'login' ? (
                  <View>
                    <AuthTextInput
                      autoComplete="email"
                      error={loginErrors.email}
                      keyboardType="email-address"
                      label="Email"
                      onChangeText={text => {
                        setEmail(text);
                        setLoginErrors(current => ({
                          ...current,
                          email: undefined,
                        }));
                      }}
                      placeholder="you@example.com"
                      textContentType="emailAddress"
                      value={email}
                    />
                    <Spacer.Column numberOfSpaces={5} />
                    <AuthTextInput
                      autoComplete="password"
                      error={loginErrors.password}
                      label="Password"
                      onChangeText={text => {
                        setPassword(text);
                        setLoginErrors(current => ({
                          ...current,
                          password: undefined,
                        }));
                      }}
                      placeholder="Your password"
                      secureTextEntry
                      textContentType="password"
                      value={password}
                    />
                    <Spacer.Column numberOfSpaces={4} />
                    <Text
                      style={styles.forgotPasswordLink}
                      onPress={() =>
                        navigation.navigate('ForgotPassword', {
                          returnTo: 'LinkChildQrAuth',
                        })
                      }>
                      Forgot password?
                    </Text>
                  </View>
                ) : (
                  <View>
                    <AuthTextInput
                      autoCapitalize="words"
                      autoComplete="name-given"
                      error={signupErrors.firstName}
                      label="First name"
                      onChangeText={text => {
                        setFirstName(text);
                        setSignupErrors(current => ({
                          ...current,
                          firstName: undefined,
                        }));
                      }}
                      placeholder="First name"
                      textContentType="givenName"
                      value={firstName}
                    />
                    <Spacer.Column numberOfSpaces={4} />
                    <AuthTextInput
                      autoCapitalize="words"
                      autoComplete="name-family"
                      error={signupErrors.lastName}
                      label="Last name"
                      onChangeText={text => {
                        setLastName(text);
                        setSignupErrors(current => ({
                          ...current,
                          lastName: undefined,
                        }));
                      }}
                      placeholder="Last name"
                      textContentType="familyName"
                      value={lastName}
                    />
                    <Spacer.Column numberOfSpaces={4} />
                    <AuthTextInput
                      autoComplete="email"
                      error={signupErrors.email}
                      keyboardType="email-address"
                      label="Email"
                      onChangeText={text => {
                        setEmail(text);
                        setSignupErrors(current => ({
                          ...current,
                          email: undefined,
                        }));
                      }}
                      placeholder="you@example.com"
                      textContentType="emailAddress"
                      value={email}
                    />
                    <Spacer.Column numberOfSpaces={4} />
                    <AuthTextInput
                      autoComplete="password-new"
                      error={signupErrors.password}
                      label="Password"
                      onChangeText={text => {
                        setPassword(text);
                        setSignupErrors(current => ({
                          ...current,
                          password: undefined,
                        }));
                      }}
                      placeholder="At least 6 characters"
                      secureTextEntry
                      textContentType="newPassword"
                      value={password}
                    />
                    <Spacer.Column numberOfSpaces={4} />
                    <AuthTextInput
                      autoComplete="password-new"
                      error={signupErrors.confirmPassword}
                      label="Confirm password"
                      onChangeText={text => {
                        setConfirmPassword(text);
                        setSignupErrors(current => ({
                          ...current,
                          confirmPassword: undefined,
                        }));
                      }}
                      placeholder="Re-enter your password"
                      secureTextEntry
                      textContentType="newPassword"
                      value={confirmPassword}
                    />
                  </View>
                )}

                {formError ? (
                  <Text style={styles.formError}>{formError}</Text>
                ) : null}

                <View style={styles.submitWrap}>
                  <AuthButton
                    loading={loading}
                    onPress={() => {
                      if (mode === 'login') {
                        handleLogin().catch(() => undefined);
                        return;
                      }
                      handleSignup().catch(() => undefined);
                    }}
                    title={mode === 'login' ? 'Log in' : 'Sign up'}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    qrStage: {
      alignItems: 'center',
      flex: 1,
      gap: spacing.sm,
      paddingTop: spacing.md,
    },
    stageEyebrow: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    stageTitle: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 28,
      textAlign: 'center',
    },
    stageSubtitle: {
      ...typography.body,
      color: colors.text.secondary,
      opacity: 0.72,
      paddingHorizontal: spacing.md,
      textAlign: 'center',
    },
    qrCard: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      justifyContent: 'center',
      marginTop: spacing.lg,
      minHeight: 240,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 320,
    },
    qrCardActive: {
      borderColor: colors.brand.teal,
    },
    lockBadge: {
      alignItems: 'center',
      backgroundColor: colors.background.accent,
      borderRadius: 28,
      height: 56,
      justifyContent: 'center',
      marginBottom: spacing.md,
      width: 56,
    },
    loader: {
      marginBottom: spacing.md,
    },
    qrHint: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
      textAlign: 'center',
    },
    qrHintSecondary: {
      ...typography.caption,
      color: colors.text.secondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalScrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(2, 8, 20, 0.55)',
    },
    sheetWrap: {
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background.primary,
      borderColor: colors.border.default,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      backgroundColor: colors.border.strong,
      borderRadius: 999,
      height: 5,
      marginBottom: spacing.md,
      width: 44,
    },
    sheetTitle: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 24,
      lineHeight: 30,
    },
    sheetSubtitle: {
      ...typography.caption,
      color: colors.text.secondary,
      marginBottom: spacing.md,
      marginTop: spacing.xs,
      opacity: 0.8,
    },
    segment: {
      backgroundColor: colors.input.background,
      borderRadius: radii.md,
      flexDirection: 'row',
      marginBottom: spacing.md,
      padding: 4,
    },
    segmentItem: {
      alignItems: 'center',
      borderRadius: radii.sm,
      flex: 1,
      paddingVertical: 10,
    },
    segmentItemActive: {
      backgroundColor: colors.background.accentStrong,
    },
    segmentLabel: {
      ...typography.label,
      color: colors.text.secondary,
    },
    segmentLabelActive: {
      color: colors.text.brand,
    },
    formScroll: {
      paddingBottom: spacing.xl,
    },
    submitWrap: {
      marginTop: 100,
    },
    forgotPasswordLink: {
      alignSelf: 'flex-end',
      color: colors.text.brand,
      fontSize: 14,
      fontWeight: '600',
    },
    formError: {
      color: colors.error,
      fontSize: 14,
      marginTop: spacing.md,
      textAlign: 'center',
    },
  });
}
