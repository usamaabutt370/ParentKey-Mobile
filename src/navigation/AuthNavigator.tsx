import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { APP_VARIANT } from '../lib/appInfo';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const showSignup = APP_VARIANT !== 'child';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen component={LoginScreen} name="Login" />
      {showSignup ? (
        <Stack.Screen component={SignupScreen} name="Signup" />
      ) : null}
      <Stack.Screen component={ForgotPasswordScreen} name="ForgotPassword" />
    </Stack.Navigator>
  );
}
