import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { AuthButton, ScreenLayout } from '../../../components';
import { getChildAvatar } from '../../../constants/childAvatars';
import { useTheme } from '../../../context/ThemeContext';
import type { ChildrenStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { radii, spacing, typography } from '../../../theme';

type Props = NativeStackScreenProps<ChildrenStackParamList, 'AddChildSuccess'>;

export function AddChildSuccessScreen({ navigation, route }: Props) {
  const { profile, email } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const avatar = getChildAvatar(profile.avatarId);
  const displayName = `${profile.firstName} ${profile.lastName}`;

  const handleDone = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ChildrenList' }],
    });
  };

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.checkCircle}>
          <Feather color={colors.brand.tealLight} name="check" size={36} />
        </View>
        <Text style={styles.title}>{displayName} is linked!</Text>
        <Text style={styles.subtitle}>
          They can sign in on their device using the credentials you created.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name</Text>
          <Text style={styles.summaryValue}>{displayName}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Email</Text>
          <Text style={styles.summaryValue}>{email}</Text>
        </View>
        {profile.age ? (
          <>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Age</Text>
              <Text style={styles.summaryValue}>{profile.age} years old</Text>
            </View>
          </>
        ) : null}
        {avatar ? (
          <>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Avatar</Text>
              <Text style={styles.summaryValue}>{avatar.emoji}</Text>
            </View>
          </>
        ) : null}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text style={[styles.summaryValue, styles.status]}>
            Ready to sign in
          </Text>
        </View>
      </View>

      <AuthButton onPress={handleDone} title="Back to children" />
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
      justifyContent: 'center',
    },
    hero: {
      alignItems: 'center',
      gap: spacing.md,
      paddingTop: spacing.xl,
    },
    checkCircle: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: radii.pill,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 26,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    summaryCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.md,
    },
    summaryRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    summaryLabel: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    summaryValue: {
      ...typography.label,
      color: colors.text.primary,
      flexShrink: 1,
      textAlign: 'right',
    },
    status: {
      color: colors.success,
    },
    divider: {
      backgroundColor: colors.border.default,
      height: StyleSheet.hairlineWidth,
    },
  });
}
