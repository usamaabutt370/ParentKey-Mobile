/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import './src/lib/splash';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppContent() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar
        backgroundColor={colors.background.primary}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
