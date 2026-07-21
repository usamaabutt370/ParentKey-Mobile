import React, { useEffect, useMemo } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { APP_VARIANT } from '../lib/appInfo';
import { hideSplashWhenReady } from '../lib/splash';
import { ChildPairingScreen } from '../screens/child/ChildPairingScreen';
import { WrongAppScreen } from '../screens/WrongAppScreen';
import type { ColorPalette } from '../theme/colors';
import { AuthNavigator } from './AuthNavigator';
import { ChildStackNavigator } from './ChildStackNavigator';
import { ParentSetupGate } from './ParentSetupGate';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import type { AppStackParamList } from './types';

const AppStack = createNativeStackNavigator<AppStackParamList>();

function AppStackNavigator() {
  const { role } = useAuth();

  if (role && APP_VARIANT && role !== APP_VARIANT) {
    return (
      <SplashReadyOnMount>
        <WrongAppScreen accountRole={role} appVariant={APP_VARIANT} />
      </SplashReadyOnMount>
    );
  }

  if (role === 'child' || APP_VARIANT === 'child') {
    return (
      <AppStack.Navigator
        initialRouteName="ChildFlow"
        screenOptions={{ headerShown: false }}>
        <AppStack.Screen component={ChildStackNavigator} name="ChildFlow" />
      </AppStack.Navigator>
    );
  }

  // Parent: first-run Kids360-style onboarding, then dashboard tabs.
  return <ParentSetupGate />;
}

function buildNavigationTheme(colors: ColorPalette, isDark: boolean) {
  const base = isDark ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background.primary,
      card: colors.background.primary,
      text: colors.text.primary,
      border: colors.border.default,
      primary: colors.brand.teal,
    },
  };
}

export function RootNavigator() {
  const { session, loading, passwordRecoveryPending } = useAuth();
  const { colors, isDark } = useTheme();
  const navigationTheme = useMemo(
    () => buildNavigationTheme(colors, isDark),
    [colors, isDark],
  );

  // Keep the native splash up while the session is restored — do not paint a
  // blank/spinner frame underneath it.
  if (loading) {
    return null;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {passwordRecoveryPending ? (
        <SplashReadyOnMount>
          <ResetPasswordScreen />
        </SplashReadyOnMount>
      ) : session ? (
        <AppStackNavigator />
      ) : APP_VARIANT === 'child' ? (
        <SplashReadyOnMount>
          <ChildPairingScreen />
        </SplashReadyOnMount>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

/** Hides the splash on the first paint of a screen that needs no extra gate. */
function SplashReadyOnMount({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hideSplashWhenReady();
  }, []);

  return <>{children}</>;
}
