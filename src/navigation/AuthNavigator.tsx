import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScreenLayout } from '../components';
import { useTheme } from '../context/ThemeContext';
import { APP_VARIANT } from '../lib/appInfo';
import {
  clearPreAuthSetupRoute,
  getPreAuthSetupRoute,
  isParentWelcomeVisited,
} from '../lib/pendingParentAction';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { DeviceRoleScreen } from '../screens/parent/onboarding/DeviceRoleScreen';
import { LinkChildQrAuthScreen } from '../screens/parent/onboarding/LinkChildQrAuthScreen';
import { ParentAddChildIntroScreen } from '../screens/parent/onboarding/ParentAddChildIntroScreen';
import { ParentInstallChildAppScreen } from '../screens/parent/onboarding/ParentInstallChildAppScreen';
import { ParentWelcomeScreen } from '../screens/parent/onboarding/ParentWelcomeScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const showSignup = APP_VARIANT !== 'child';
  const { colors } = useTheme();
  const [ready, setReady] = useState(!showSignup);
  const [initialRouteName, setInitialRouteName] =
    useState<keyof AuthStackParamList>(showSignup ? 'DeviceRole' : 'Login');

  useEffect(() => {
    if (!showSignup) {
      return;
    }

    let cancelled = false;

    const resolveInitialRoute = async () => {
      const welcomeVisited = await isParentWelcomeVisited();
      if (cancelled) {
        return;
      }

      // Until the welcome onboarding is completed, always reopen on role pick.
      if (!welcomeVisited) {
        await clearPreAuthSetupRoute();
        if (cancelled) {
          return;
        }
        setInitialRouteName('DeviceRole');
        setReady(true);
        return;
      }

      const savedSetupRoute = await getPreAuthSetupRoute();
      if (cancelled) {
        return;
      }

      setInitialRouteName(savedSetupRoute ?? 'Welcome');
      setReady(true);
    };

    resolveInitialRoute().catch(() => undefined);

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
        <Stack.Screen component={DeviceRoleScreen} name="DeviceRole" />
      ) : null}
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

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

