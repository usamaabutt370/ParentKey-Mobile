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
import { ChildHomeScreen } from '../screens/ChildHomeScreen';
import type { ColorPalette } from '../theme/colors';
import { AuthNavigator } from './AuthNavigator';
import { ParentTabNavigator } from './ParentTabNavigator';
import type { AppStackParamList } from './types';

const AppStack = createNativeStackNavigator<AppStackParamList>();

function AppStackNavigator() {
  const { role } = useAuth();
  const initialRouteName = role === 'child' ? 'ChildHome' : 'ParentTabs';

  return (
    <AppStack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}>
      <AppStack.Screen component={ParentTabNavigator} name="ParentTabs" />
      <AppStack.Screen component={ChildHomeScreen} name="ChildHome" />
    </AppStack.Navigator>
  );
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
  const { session, loading } = useAuth();
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
      {session ? <AppStackNavigator /> : <AuthNavigator />}
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
