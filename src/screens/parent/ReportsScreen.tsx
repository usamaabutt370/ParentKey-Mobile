import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenLayout, useScreenStyles } from '../../components';
import {
  RecentAlertsList,
  SectionHeader,
  StatCard,
  TopAppsReport,
  WeeklyUsageChart,
} from '../../components/parent';
import {
  MOCK_RECENT_ALERTS,
  MOCK_REPORT_SUMMARY,
  MOCK_TOP_APPS,
  MOCK_WEEKLY_USAGE,
} from '../../constants/mockReportData';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

export function ParentReportsScreen() {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Reports</Text>
        <Text style={screenStyles.subtitle}>
          Usage trends and app breakdowns
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Today" value={MOCK_REPORT_SUMMARY.today} />
        <StatCard label="This week" value={MOCK_REPORT_SUMMARY.thisWeek} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Weekly overview" />
        <WeeklyUsageChart data={MOCK_WEEKLY_USAGE} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Top apps today" />
        <TopAppsReport apps={MOCK_TOP_APPS} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent alerts" />
        <RecentAlertsList alerts={MOCK_RECENT_ALERTS} />
      </View>
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
  });
}
