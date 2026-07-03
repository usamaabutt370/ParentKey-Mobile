import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout, useScreenStyles } from '../../components';
import { ActiveBlockRuleCard, SectionHeader } from '../../components/parent';
import { useTheme } from '../../context/ThemeContext';
import { useParentBlockRules } from '../../hooks/useParentBlockRules';
import type { ControlsStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ControlsStackParamList, 'ControlsList'>;

export function ParentControlsScreen({ navigation }: Props) {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { summaries, loading, error } = useParentBlockRules();

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Controls</Text>
        <Text style={screenStyles.subtitle}>
          Set limits, block apps, and manage schedules
        </Text>
      </View>

      <View style={styles.actions}>
        <AuthButton
          onPress={() => navigation.navigate('SelectChild', { mode: 'block' })}
          title="Block apps"
        />
        <AuthButton
          onPress={() => navigation.navigate('SelectChild', { mode: 'limit' })}
          title="Set app limits"
          variant="secondary"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          actionLabel="Block apps"
          onActionPress={() =>
            navigation.navigate('SelectChild', { mode: 'block' })
          }
          title="Active rules"
        />
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brand.tealLight} size="large" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : summaries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active block rules</Text>
            <Text style={styles.emptyBody}>
              Block apps for a child and they will appear here. Your child must
              be signed in on their Android device for rules to apply.
            </Text>
          </View>
        ) : (
          <View style={styles.ruleList}>
            {summaries.map(summary => (
              <ActiveBlockRuleCard
                childName={summary.childName}
                key={summary.childId}
                onPress={() =>
                  navigation.navigate('SelectApps', {
                    mode: 'block',
                    childId: summary.childId,
                  })
                }
                rules={summary.rules}
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
    actions: {
      gap: spacing.sm,
    },
    section: {
      gap: spacing.md,
    },
    ruleList: {
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
