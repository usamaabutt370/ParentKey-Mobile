import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScreenLayout } from '../components';
import { useTheme } from '../context/ThemeContext';
import { APP_VARIANT } from '../lib/appInfo';
import { getPreAuthSetupRoute } from '../lib/pendingParentAction';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { LinkChildQrAuthScreen } from '../screens/parent/onboarding/LinkChildQrAuthScreen';
import { ParentAddChildIntroScreen } from '../screens/parent/onboarding/ParentAddChildIntroScreen';
import { ParentInstallChildAppScreen } from '../screens/parent/onboarding/ParentInstallChildAppScreen';
import { ParentWelcomeScreen } from '../screens/parent/onboarding/ParentWelcomeScreen';
import type { ColorPalette } from '../theme/colors';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const showSignup = APP_VARIANT !== 'child';
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [ready, setReady] = useState(!showSignup);
  const [initialRouteName, setInitialRouteName] =
    useState<keyof AuthStackParamList>(showSignup ? 'Welcome' : 'Login');

  useEffect(() => {
    if (!showSignup) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const savedRoute = await getPreAuthSetupRoute();
      if (cancelled) {
        return;
      }

      if (savedRoute) {
        setInitialRouteName(savedRoute);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [showSignup]);

  if (!ready) {
    return (
      <ScreenLayout contentStyle={styles.loading}>
        <ActivityIndicator color={colors.brand.tealLight} size="large" />
      </ScreenLayout>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      key={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      {showSignup ? (
        <Stack.Screen component={ParentWelcomeScreen} name="Welcome" />
      ) : null}
      {showSignup ? (
        <Stack.Screen
          component={ParentAddChildIntroScreen}
          name="AddChildIntro"
        />
      ) : null}
      {showSignup ? (
        <Stack.Screen
          component={ParentInstallChildAppScreen}
          name="InstallChildApp"
        />
      ) : null}
      {showSignup ? (
        <Stack.Screen
          component={LinkChildQrAuthScreen}
          name="LinkChildQrAuth"
        />
      ) : null}
      <Stack.Screen component={LoginScreen} name="Login" />
      {showSignup ? (
        <Stack.Screen component={SignupScreen} name="Signup" />
      ) : null}
      <Stack.Screen component={ForgotPasswordScreen} name="ForgotPassword" />
    </Stack.Navigator>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    loading: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
