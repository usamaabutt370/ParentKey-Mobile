import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthButton, ScreenLayout, Spacer } from '../components';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { AppVariant } from '../lib/appInfo';
import type { ColorPalette } from '../theme/colors';
import { typography } from '../theme';
import type { UserRole } from '../types/auth';
import { USER_ROLE_LABELS } from '../types/auth';

type Props = {
  appVariant: AppVariant;
  accountRole: UserRole;
};

export function WrongAppScreen({ appVariant, accountRole }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signOut } = useAuth();

  const expectedRole: UserRole = appVariant === 'child' ? 'child' : 'parent';

  return (
    <ScreenLayout>
      <View style={styles.content}>
        <Text style={styles.title}>Wrong app</Text>
        <Spacer.Column numberOfSpaces={8} />
        <Text style={styles.message}>
          This is a {USER_ROLE_LABELS[accountRole]} account. Please sign in
          from the ParentKey {USER_ROLE_LABELS[expectedRole]} app instead.
        </Text>
        <Spacer.Column numberOfSpaces={16} />
        <AuthButton onPress={signOut} title="Sign out" />
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
      textAlign: 'center',
    },
    message: {
      ...typography.subtitle,
      color: colors.text.secondary,
      textAlign: 'center',
    },
  });
}
