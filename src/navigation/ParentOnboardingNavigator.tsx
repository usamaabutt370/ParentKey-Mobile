import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentAddChildIntroScreen } from '../screens/parent/onboarding/ParentAddChildIntroScreen';
import { ParentInstallChildAppScreen } from '../screens/parent/onboarding/ParentInstallChildAppScreen';
import { ParentPairingSuccessScreen } from '../screens/parent/onboarding/ParentPairingSuccessScreen';
import { ParentShowPairingQrScreen } from '../screens/parent/onboarding/ParentShowPairingQrScreen';
import type { ParentOnboardingParamList } from './types';

const Stack = createNativeStackNavigator<ParentOnboardingParamList>();

export function ParentOnboardingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AddChildIntro"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen component={ParentAddChildIntroScreen} name="AddChildIntro" />
      <Stack.Screen
        component={ParentInstallChildAppScreen}
        name="InstallChildApp"
      />
      <Stack.Screen
        component={ParentShowPairingQrScreen}
        name="ShowPairingQr"
      />
      <Stack.Screen
        component={ParentPairingSuccessScreen}
        name="PairingSuccess"
      />
    </Stack.Navigator>
  );
}
