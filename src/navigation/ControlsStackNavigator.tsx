import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentControlsScreen } from '../screens/parent/ControlsScreen';
import { SelectAppsScreen } from '../screens/parent/SelectAppsScreen';
import { SelectChildScreen } from '../screens/parent/SelectChildScreen';
import type { ControlsStackParamList } from './types';

const Stack = createNativeStackNavigator<ControlsStackParamList>();

export function ControlsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ParentControlsScreen} name="ControlsList" />
      <Stack.Screen component={SelectChildScreen} name="SelectChild" />
      <Stack.Screen component={SelectAppsScreen} name="SelectApps" />
    </Stack.Navigator>
  );
}
