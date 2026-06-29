import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  ChildCard,
  RecentAlertsList,
  SectionHeader,
  StatCard,
  TopAppsReport,
  WeeklyUsageChart,
} from '../../components/parent';
import { ScreenLayout, useScreenStyles } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useParentChildren } from '../../hooks/useParentChildren';
import {
  MOCK_DASHBOARD_STATS,
} from '../../constants/mockParentData';
import {
  MOCK_RECENT_ALERTS,
  MOCK_REPORT_SUMMARY,
  MOCK_TOP_APPS,
  MOCK_WEEKLY_USAGE,
} from '../../constants/mockReportData';
import type { ParentTabParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type HomeNavigation = BottomTabNavigationProp<ParentTabParamList, 'Home'>;

export function ParentHomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const { children, loading: childrenLoading } = useParentChildren();
  const firstName = session?.user.user_metadata?.first_name;

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.brand}>ParentKey</Text>
        <Text style={[screenStyles.title, styles.greeting]}>
          {firstName ? `Hi, ${firstName}` : 'Dashboard'}
        </Text>
        <Text style={screenStyles.subtitle}>
          Here&apos;s how your family is doing today
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Screen time"
          value={MOCK_DASHBOARD_STATS.totalScreenTime}
        />
        <StatCard
          accent={colors.brand.tealLight}
          label="Active rules"
          value={String(MOCK_DASHBOARD_STATS.activeRestrictions)}
        />
        <StatCard
          accent={colors.error}
          label="Alerts"
          value={String(MOCK_DASHBOARD_STATS.alerts)}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          actionLabel="Full report"
          onActionPress={() => navigation.navigate('Reports')}
          title="Today's usage"
        />
        <View style={styles.reportSummaryRow}>
          <View style={styles.reportSummaryCard}>
            <Text style={styles.reportSummaryValue}>
              {MOCK_REPORT_SUMMARY.today}
            </Text>
            <Text style={styles.reportSummaryLabel}>Today</Text>
          </View>
          <View style={styles.reportSummaryCard}>
            <Text style={styles.reportSummaryValue}>
              {MOCK_REPORT_SUMMARY.thisWeek}
            </Text>
            <Text style={styles.reportSummaryLabel}>This week</Text>
          </View>
          <View style={styles.reportSummaryCard}>
            <Text style={[styles.reportSummaryValue, styles.trendUp]}>
              {MOCK_REPORT_SUMMARY.vsLastWeek}
            </Text>
            <Text style={styles.reportSummaryLabel}>vs last week</Text>
          </View>
        </View>
        <TopAppsReport apps={MOCK_TOP_APPS} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Weekly overview" />
        <WeeklyUsageChart data={MOCK_WEEKLY_USAGE} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent alerts" />
        <RecentAlertsList alerts={MOCK_RECENT_ALERTS} />
      </View>

      <View style={styles.section}>
        <SectionHeader
          actionLabel="See all"
          onActionPress={() => navigation.navigate('Children')}
          title="Your children"
        />
        <View style={styles.childList}>
          {childrenLoading ? (
            <ActivityIndicator color={colors.brand.tealLight} size="small" />
          ) : children.length === 0 ? (
            <Text style={styles.emptyChildrenText}>
              No children linked yet. Tap See all to add one.
            </Text>
          ) : (
            children.map(child => (
              <ChildCard
                child={child}
                key={child.id}
                onPress={() =>
                  navigation.navigate('Children', {
                    screen: 'ChildDetail',
                    params: { childId: child.id },
                  })
                }
              />
            ))
          )}
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
    greeting: {
      fontSize: 28,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    section: {
      gap: spacing.md,
    },
    reportSummaryRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    reportSummaryCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flex: 1,
      gap: spacing.xs,
      padding: spacing.md,
    },
    reportSummaryValue: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
      fontWeight: '700',
    },
    trendUp: {
      color: colors.error,
    },
    reportSummaryLabel: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    childList: {
      gap: spacing.sm,
    },
    emptyChildrenText: {
      ...typography.body,
      color: colors.text.secondary,
    },
  });
}
