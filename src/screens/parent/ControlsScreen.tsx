import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout, useScreenStyles } from '../../components';
import { SectionHeader } from '../../components/parent';
import { useTheme } from '../../context/ThemeContext';
import type { ControlsStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ControlsStackParamList, 'ControlsList'>;

const MOCK_CONTROLS = [
  {
    id: '1',
    title: 'Daily screen time',
    description: '2h limit for Emma on weekdays',
    enabled: true,
  },
  {
    id: '2',
    title: 'Bedtime',
    description: '9:00 PM – 7:00 AM for all children',
    enabled: true,
  },
  {
    id: '3',
    title: 'Blocked apps',
    description: 'TikTok, Snapchat blocked for Liam',
    enabled: true,
  },
  {
    id: '4',
    title: 'Instant lock',
    description: "Liam's device is locked",
    enabled: false,
  },
];

export function ParentControlsScreen({ navigation }: Props) {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
          onPress={() => navigation.navigate('SelectApps', { mode: 'block' })}
          title="Block apps"
        />
        <AuthButton
          onPress={() => navigation.navigate('SelectApps', { mode: 'limit' })}
          title="Set app limits"
          variant="secondary"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Active rules" actionLabel="Add rule" />
        <View style={styles.ruleList}>
          {MOCK_CONTROLS.map(rule => (
            <View key={rule.id} style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleTitle}>{rule.title}</Text>
                <View
                  style={[
                    styles.badge,
                    rule.enabled ? styles.badgeActive : styles.badgeInactive,
                  ]}>
                  <Text
                    style={[
                      styles.badgeText,
                      rule.enabled
                        ? styles.badgeTextActive
                        : styles.badgeTextInactive,
                    ]}>
                    {rule.enabled ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <Text style={styles.ruleDescription}>{rule.description}</Text>
            </View>
          ))}
        </View>
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
    ruleCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    ruleHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    ruleTitle: {
      ...typography.label,
      color: colors.text.primary,
      flex: 1,
      fontSize: 16,
    },
    badge: {
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    badgeActive: {
      backgroundColor: colors.background.accent,
    },
    badgeInactive: {
      backgroundColor: colors.border.default,
    },
    badgeText: {
      ...typography.caption,
      fontWeight: '600',
    },
    badgeTextActive: {
      color: colors.text.brand,
    },
    badgeTextInactive: {
      color: colors.text.placeholder,
    },
    ruleDescription: {
      ...typography.caption,
      color: colors.text.secondary,
    },
  });
}
