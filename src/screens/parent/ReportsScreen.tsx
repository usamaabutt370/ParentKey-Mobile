import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout, useScreenStyles } from '../../components';
import {
  ChildActivityCard,
  RecentAlertsList,
  SectionHeader,
  StatCard,
  TopAppsReport,
  WeeklyUsageChart,
} from '../../components/parent';
import { useParentActivityDashboard } from '../../hooks/useParentActivityDashboard';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

export function ParentReportsScreen() {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    summary,
    stats,
    topApps,
    weeklyUsage,
    childSummaries,
    alerts,
    loading,
    error,
  } = useParentActivityDashboard();

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Reports</Text>
        <Text style={screenStyles.subtitle}>
          Live activity synced from your children&apos;s Android devices
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand.tealLight} size="large" />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard label="Today" value={summary.todayLabel} />
            <StatCard label="This week" value={summary.weekLabel} />
            <StatCard
              accent={colors.brand.tealLight}
              label="Active rules"
              value={String(stats.activeRulesCount)}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader title="By child" />
            {childSummaries.length === 0 ? (
              <Text style={styles.emptyText}>No linked children yet.</Text>
            ) : (
              <View style={styles.childActivityList}>
                {childSummaries.map(item => (
                  <ChildActivityCard key={item.childId} summary={item} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Weekly overview" />
            {weeklyUsage.every(day => day.hours === 0) ? (
              <Text style={styles.emptyText}>
                No usage synced yet. Enable Usage access on the child device and
                tap Sync apps and rules.
              </Text>
            ) : (
              <WeeklyUsageChart data={weeklyUsage} />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Top apps today" />
            {topApps.length === 0 ? (
              <Text style={styles.emptyText}>
                No app usage recorded for today yet.
              </Text>
            ) : (
              <TopAppsReport apps={topApps} />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Recent activity" />
            <RecentAlertsList alerts={alerts} />
          </View>
        </>
      )}
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    section: {
      gap: spacing.md,
    },
    childActivityList: {
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
    emptyText: {
      ...typography.body,
      color: colors.text.secondary,
      lineHeight: 22,
    },
  });
}
