import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScreenLayout } from '../components';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { APP_VARIANT } from '../lib/appInfo';
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
    return <WrongAppScreen accountRole={role} appVariant={APP_VARIANT} />;
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
  const styles = useMemo(() => createStyles(), []);

  if (loading) {
    return (
      <ScreenLayout contentStyle={styles.loading}>
        <ActivityIndicator color={colors.brand.tealLight} size="large" />
      </ScreenLayout>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {passwordRecoveryPending ? (
        <ResetPasswordScreen />
      ) : session ? (
        <AppStackNavigator />
      ) : APP_VARIANT === 'child' ? (
        <ChildPairingScreen />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

function createStyles() {
  return StyleSheet.create({
    loading: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
