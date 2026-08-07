import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentSettingsScreen } from '../screens/parent/SettingsScreen';
import { LegalDocumentScreen } from '../screens/parent/LegalDocumentScreen';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ParentSettingsScreen} name="SettingsHome" />
      <Stack.Screen component={LegalDocumentScreen} name="LegalDocument" />
    </Stack.Navigator>
  );
}
