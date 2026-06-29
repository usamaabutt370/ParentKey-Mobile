import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout, useScreenStyles } from '../../components';
import { ChildCard, SectionHeader } from '../../components/parent';
import { useTheme } from '../../context/ThemeContext';
import { useParentChildren } from '../../hooks/useParentChildren';
import type { ChildrenStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ChildrenStackParamList, 'ChildrenList'>;

export function ParentChildrenScreen({ navigation }: Props) {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children, loading, error } = useParentChildren();

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Children</Text>
        <Text style={screenStyles.subtitle}>
          Manage profiles, devices, and linked accounts
        </Text>
      </View>

      <AuthButton
        onPress={() => navigation.navigate('AddChildProfile')}
        title="Add child"
      />

      <View style={styles.section}>
        <SectionHeader title="Linked children" />
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brand.tealLight} size="large" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : children.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No children linked yet</Text>
            <Text style={styles.emptyBody}>
              Add a child account so they can sign in on their device with the
              Child role.
            </Text>
          </View>
        ) : (
          <View style={styles.childList}>
            {children.map(child => (
              <ChildCard
                child={child}
                key={child.id}
                onPress={() =>
                  navigation.navigate('ChildDetail', { childId: child.id })
                }
              />
            ))}
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
    },
    section: {
      gap: spacing.md,
    },
    childList: {
      gap: spacing.sm,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
    },
    errorText: {
      ...typography.body,
      color: colors.error,
    },
    emptyCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.lg,
    },
    emptyTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    emptyBody: {
      ...typography.body,
      color: colors.text.secondary,
    },
  });
}
