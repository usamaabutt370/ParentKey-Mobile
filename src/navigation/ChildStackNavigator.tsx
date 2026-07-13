import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScreenLayout } from '../components';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useChildLinkGuard } from '../hooks/useChildLinkGuard';
import { isChildSetupComplete } from '../lib/childSetup';
import { ChildHomeScreen } from '../screens/ChildHomeScreen';
import { ChildConsentScreen } from '../screens/child/ChildConsentScreen';
import { ChildDeviceSyncScreen } from '../screens/child/ChildDeviceSyncScreen';
import { ChildPermissionsScreen } from '../screens/child/ChildPermissionsScreen';
import type { ChildStackParamList } from './types';

const Stack = createNativeStackNavigator<ChildStackParamList>();

export function ChildStackNavigator() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const childId = session?.user.id;
  const [initialRoute, setInitialRoute] =
    useState<keyof ChildStackParamList | null>(null);

  useChildLinkGuard();

  useEffect(() => {
    let cancelled = false;

    const resolveInitialRoute = async () => {
      if (!childId) {
        setInitialRoute('ChildConsent');
        return;
      }

      const complete = await isChildSetupComplete(childId);
      if (!cancelled) {
        setInitialRoute(complete ? 'ChildHome' : 'ChildConsent');
      }
    };

    void resolveInitialRoute();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  if (!initialRoute) {
    return (
      <ScreenLayout contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand.tealLight} size="large" />
      </ScreenLayout>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ChildConsentScreen} name="ChildConsent" />
      <Stack.Screen component={ChildPermissionsScreen} name="ChildPermissions" />
      <Stack.Screen component={ChildDeviceSyncScreen} name="ChildDeviceSync" />
      <Stack.Screen component={ChildHomeScreen} name="ChildHome" />
    </Stack.Navigator>
  );
}
