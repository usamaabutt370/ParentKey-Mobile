import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentChildrenScreen } from '../screens/parent/ChildrenScreen';
import {
  AddChildAccountScreen,
  AddChildProfileScreen,
  AddChildSuccessScreen,
} from '../screens/parent/add-child';
import type { ChildrenStackParamList } from './types';

const Stack = createNativeStackNavigator<ChildrenStackParamList>();

export function ChildrenStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ParentChildrenScreen} name="ChildrenList" />
      <Stack.Screen component={AddChildProfileScreen} name="AddChildProfile" />
      <Stack.Screen component={AddChildAccountScreen} name="AddChildAccount" />
      <Stack.Screen component={AddChildSuccessScreen} name="AddChildSuccess" />
    </Stack.Navigator>
  );
}
