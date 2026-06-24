import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { AuthButton, ScreenLayout, useScreenStyles } from '../components';
import { useAuth } from '../context/AuthContext';
import { USER_ROLE_LABELS } from '../types/auth';

export function ChildHomeScreen() {
  const screenStyles = useScreenStyles();
  const { session, signOut } = useAuth();
  const firstName = session?.user.user_metadata?.first_name;

  return (
    <ScreenLayout>
      <Text style={screenStyles.brand}>ParentKey</Text>
      <Text style={[screenStyles.title, styles.title]}>
        {firstName ? `Hi, ${firstName}` : 'Child dashboard'}
      </Text>
      <Text style={screenStyles.subtitle}>
        Signed in as {USER_ROLE_LABELS.child} · {session?.user.email}
      </Text>
      <AuthButton onPress={signOut} title="Sign out" variant="secondary" />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
  },
});
