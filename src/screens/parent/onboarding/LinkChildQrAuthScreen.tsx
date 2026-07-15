import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
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
import {
  setPendingLinkChild,
  setPreAuthSetupRoute,
} from '../../../lib/pendingParentAction';
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
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 1.15;

export function LinkChildQrAuthScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signIn, signUp } = useAuth();

  const [authVisible, setAuthVisible] = useState(false);
  const [awaitingSession, setAwaitingSession] = useState(false);
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
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  useEffect(() => {
    setPendingLinkChild().catch(() => undefined);
    setPreAuthSetupRoute('LinkChildQrAuth').catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!authVisible) {
      return;
    }

    sheetTranslateY.setValue(SHEET_HEIGHT);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [authVisible, sheetTranslateY]);

  const finishCloseSheet = useCallback(() => {
    setAuthVisible(false);
    sheetTranslateY.setValue(0);
  }, [sheetTranslateY]);

  const closeAuthSheet = useCallback(() => {
    if (loadingRef.current) {
      return;
    }

    Animated.timing(sheetTranslateY, {
      toValue: SHEET_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        finishCloseSheet();
      }
    });
  }, [finishCloseSheet, sheetTranslateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !loadingRef.current,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !loadingRef.current && gesture.dy > 3,
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy > 0) {
            sheetTranslateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_event, gesture) => {
          if (loadingRef.current) {
            return;
          }

          if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
            Animated.timing(sheetTranslateY, {
              toValue: SHEET_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) {
                finishCloseSheet();
              }
            });
            return;
          }

          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
      }),
    [finishCloseSheet, sheetTranslateY],
  );

  const openAuthSheet = () => {
    setFormError(null);
    setAuthVisible(true);
  };

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
    setAuthVisible(false);
    setAwaitingSession(true);
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
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            navigation.navigate('InstallChildApp');
          }}
          style={styles.backButton}>
          <Feather color={colors.text.primary} name="chevron-left" size={24} />
        </Pressable>

        <View style={styles.qrStage}>
          <Text style={styles.stageEyebrow}>STEP 3 OF 4</Text>
          <Text style={styles.stageTitle}>Link with QR code</Text>
          <Text style={styles.stageSubtitle}>
            {awaitingSession
              ? 'You’re signed in. Preparing a secure code for your child’s phone…'
              : 'A QR code appears only after you sign in as a parent, so only your family can link a device.'}
          </Text>

          <View
            style={[
              styles.qrCard,
              awaitingSession ? styles.qrCardActive : null,
            ]}>
            {awaitingSession ? (
              <>
                <ActivityIndicator
                  color={colors.brand.tealLight}
                  size="large"
                  style={styles.loader}
                />
                <Text style={styles.qrHint}>Preparing your QR code…</Text>
              </>
            ) : (
              <>
                <View style={styles.lockBadge}>
                  <Feather
                    color={colors.brand.tealLight}
                    name="lock"
                    size={28}
                  />
                </View>
                <Text style={styles.qrHint}>No QR code yet</Text>
                <Text style={styles.qrHintSecondary}>
                  Sign in or create a parent account to generate a one-time
                  linking code. Until then, nothing can be scanned from this
                  screen.
                </Text>
              </>
            )}
          </View>
        </View>

        {!awaitingSession ? (
          <View style={styles.footer}>
            <AuthButton onPress={openAuthSheet} title="Generate QR code" />
          </View>
        ) : null}
      </SafeAreaView>

      <Modal
        animationType="fade"
        onRequestClose={closeAuthSheet}
        transparent
        visible={authVisible}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Dismiss"
            accessibilityRole="button"
            onPress={closeAuthSheet}
            style={styles.modalScrim}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetWrap}>
            <Animated.View
              style={[
                styles.sheet,
                {
                  height: SHEET_HEIGHT,
                  transform: [{ translateY: sheetTranslateY }],
                },
              ]}>
              <View
                {...panResponder.panHandlers}
                accessibilityHint="Swipe down to close"
                accessibilityLabel="Drag handle"
                accessibilityRole="adjustable"
                style={styles.sheetTopBar}>
                <View style={styles.handle} />
              </View>
              <View style={{marginTop:10, marginBottom:30}}>
              <Text style={styles.sheetTitle}>
                {mode === 'login' ? 'Log in to continue' : 'Create parent account'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                After this, your linking QR code will appear on this screen.
              </Text>
              </View>
              <ScrollView
                contentContainerStyle={styles.formScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.formScrollView}>
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
                      onPress={() => {
                        setAuthVisible(false);
                        navigation.navigate('ForgotPassword', {
                          returnTo: 'LinkChildQrAuth',
                        });
                      }}>
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
                <View style={styles.modeSwitch}>
                {mode === 'login' ? (
                  <Text style={styles.modeSwitchText}>
                    Don&apos;t have an account?{' '}
                    <Text
                      style={styles.modeSwitchLink}
                      onPress={() => switchMode('signup')}>
                      Sign up
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.modeSwitchText}>
                    Already have an account?{' '}
                    <Text
                      style={styles.modeSwitchLink}
                      onPress={() => switchMode('login')}>
                      Log in
                    </Text>
                  </Text>
                )}
              </View>
              </ScrollView>
            </Animated.View>
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
    backButton: {
      alignSelf: 'flex-start',
      marginBottom: spacing.xs,
      marginLeft: -spacing.xs,
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
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    footer: {
      paddingBottom: spacing.md,
      paddingTop: spacing.lg,
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
    sheetTopBar: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      // Larger hit area so the handle is easy to drag.
      paddingVertical: spacing.md,
    },
    handle: {
      backgroundColor: colors.border.strong,
      borderRadius: 999,
      height: 5,
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
    formScrollView: {
      flex: 1,
    },
    formScroll: {
      flexGrow: 1,
      paddingBottom: spacing.md,
    },
    submitWrap: {
      marginTop: spacing.xl,
    },
    modeSwitch: {
      paddingBottom: spacing.sm,
      paddingTop: spacing.md,
      marginVertical: 50
    },
    modeSwitchText: {
      ...typography.body,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    modeSwitchLink: {
      color: colors.text.brand,
      fontWeight: '700',
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
