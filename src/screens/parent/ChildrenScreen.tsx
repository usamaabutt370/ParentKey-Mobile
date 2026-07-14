import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout, useScreenStyles } from '../../components';
import { ChildCard, LinkChildMethodModal, SectionHeader } from '../../components/parent';
import { useTheme } from '../../context/ThemeContext';
import { useParentActivityDashboard } from '../../hooks/useParentActivityDashboard';
import { useParentChildren } from '../../hooks/useParentChildren';
import type { ChildrenStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ChildrenStackParamList, 'ChildrenList'>;

export function ParentChildrenScreen({ navigation }: Props) {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [linkMethodVisible, setLinkMethodVisible] = useState(false);
  const { children, loading, error } = useParentChildren();
  const { childSummaries, loading: activityLoading } =
    useParentActivityDashboard();

  const summaryByChildId = useMemo(
    () => new Map(childSummaries.map(item => [item.childId, item])),
    [childSummaries],
  );

  const openLinkMethod = () => setLinkMethodVisible(true);

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

      <AuthButton onPress={openLinkMethod} title="Add child" />

      <LinkChildMethodModal
        onClose={() => setLinkMethodVisible(false)}
        onSelect={method => {
          setLinkMethodVisible(false);
          if (method === 'form') {
            navigation.navigate('AddChildProfile');
            return;
          }

          navigation.navigate('PairChildQr');
        }}
        visible={linkMethodVisible}
      />

      <View style={styles.section}>
        <SectionHeader title="Linked children" />
        {loading || activityLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brand.tealLight} size="large" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : children.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No children linked yet</Text>
            <Text style={styles.emptyBody}>
              Add a child account with a form or link their device instantly
              using a QR code.
            </Text>
            <AuthButton onPress={openLinkMethod} title="Add child" />
          </View>
        ) : (
          <View style={styles.childList}>
            {children.map(child => {
              const activity = summaryByChildId.get(child.id);

              return (
                <ChildCard
                  child={child}
                  deviceStatus={activity?.deviceStatus}
                  key={child.id}
                  onPress={() =>
                    navigation.navigate('ChildDetail', { childId: child.id })
                  }
                  screenTimeToday={
                    activity && activity.todaySeconds > 0
                      ? activity.todayLabel
                      : undefined
                  }
                />
              );
            })}
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
      paddingBottom: spacing.xxl,
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
      gap: spacing.md,
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
