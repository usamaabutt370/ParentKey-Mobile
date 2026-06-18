import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScreenLayout } from '../components';
import { useAuth } from '../context/AuthContext';
import { ChildHomeScreen } from '../screens/ChildHomeScreen';
import { ParentHomeScreen } from '../screens/ParentHomeScreen';
import { colors } from '../theme';
import { AuthNavigator } from './AuthNavigator';
import type { AppStackParamList } from './types';

const AppStack = createNativeStackNavigator<AppStackParamList>();

function AppStackNavigator() {
  const { role } = useAuth();
  const initialRouteName = role === 'child' ? 'ChildHome' : 'ParentHome';

  return (
    <AppStack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}>
      <AppStack.Screen component={ParentHomeScreen} name="ParentHome" />
      <AppStack.Screen component={ChildHomeScreen} name="ChildHome" />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <ScreenLayout contentStyle={styles.loading}>
        <ActivityIndicator color={colors.brand.tealLight} size="large" />
      </ScreenLayout>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppStackNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
