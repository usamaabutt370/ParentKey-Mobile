import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { AuthButton, ScreenLayout, useScreenStyles } from '../components';
import { IOSScreenTimeAuthSection } from '../components/ios/IOSScreenTimeAuthSection';
import { IOSScreenTimePanel } from '../components/ios/IOSScreenTimePanel';
import { InfoTipCard } from '../components/parent';
import { useAuth } from '../context/AuthContext';
import type { IOSScreenTimeAuthorizationStatus } from '../lib/iosScreenTime';
import { USER_ROLE_LABELS } from '../types/auth';
import { spacing } from '../theme';

export function ChildHomeScreen() {
  const screenStyles = useScreenStyles();
  const { session, signOut } = useAuth();
  const firstName = session?.user.user_metadata?.first_name;
  const [authStatus, setAuthStatus] =
    useState<IOSScreenTimeAuthorizationStatus>('notDetermined');
  const authApproved = authStatus === 'approved';

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={screenStyles.brand}>ParentKey</Text>
        <Text style={[screenStyles.title, styles.title]}>
          {firstName ? `Hi, ${firstName}` : 'Child dashboard'}
        </Text>
        <Text style={screenStyles.subtitle}>
          Signed in as {USER_ROLE_LABELS.child} · {session?.user.email}
        </Text>

        {Platform.OS === 'ios' ? (
          <>
            <InfoTipCard message="Set up Screen Time on this iPhone so your parent can block or limit apps. Choose apps with Apple's picker, then apply the rules below." />
            <IOSScreenTimeAuthSection onStatusChange={setAuthStatus} />
            <Text style={screenStyles.subtitle}>Block apps</Text>
            <IOSScreenTimePanel authApproved={authApproved} mode="block" stepOffset={1} />
            <Text style={screenStyles.subtitle}>Daily app limits</Text>
            <IOSScreenTimePanel authApproved={authApproved} mode="limit" stepOffset={1} />
          </>
        ) : (
          <InfoTipCard message="App controls on Android are managed from your parent's Controls tab after apps are scanned on this device." />
        )}

        <AuthButton onPress={signOut} title="Sign out" variant="secondary" />
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
  },
});
