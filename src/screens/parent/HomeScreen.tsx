import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  ChildPickerSheet,
  ChildSelectorChip,
  RecentAlertsList,
  SectionHeader,
  StatCard,
  UsagePeriodCarousel,
} from '../../components/parent';
import { ScreenLayout, useScreenStyles } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useParentActivityDashboard } from '../../hooks/useParentActivityDashboard';
import { getChildDisplayName } from '../../lib/children';
import type { ParentTabParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type HomeNavigation = BottomTabNavigationProp<ParentTabParamList, 'Home'>;

export function ParentHomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const {
    children,
    selectedChild,
    selectedChildId,
    setSelectedChildId,
    selectedSummary: summary,
    selectedStats: stats,
    selectedPeriodCards,
    selectedAlerts: alerts,
    loading: activityLoading,
  } = useParentActivityDashboard();
  const [pickerVisible, setPickerVisible] = useState(false);
  const firstName = session?.user.user_metadata?.first_name;
  const selectedName = selectedChild
    ? getChildDisplayName(selectedChild)
    : null;
  const usageEmptyHint =
    Platform.OS === 'ios'
      ? 'App usage sync is not available on iOS. Use Screen Time on the child device for limits and blocking.'
      : 'Usage data appears after the child enables Usage access and syncs.';

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.brand}>ParentKey</Text>
        {children.length > 0 ? (
          <ChildSelectorChip
            child={selectedChild}
            disabled={activityLoading && !selectedChild}
            onPress={() => setPickerVisible(true)}
          />
        ) : null}
        <Text style={[screenStyles.title, styles.greeting]}>
          {firstName ? `Hi, ${firstName}` : 'Dashboard'}
        </Text>
        <Text style={screenStyles.subtitle}>
          {selectedName
            ? `Here's how ${selectedName} is doing today`
            : "Here's how your family is doing today"}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Screen time"
          value={activityLoading ? '...' : summary.weekLabel}
        />
        <StatCard
          accent={colors.brand.tealLight}
          label="Active rules"
          value={activityLoading ? '...' : String(stats.activeRulesCount)}
        />
        <StatCard
          accent={colors.error}
          label="Alerts"
          value={activityLoading ? '...' : String(stats.alertCount)}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          actionLabel="Full report"
          onActionPress={() => navigation.navigate('Reports')}
          title="Phone usage"
        />
        {activityLoading ? (
          <ActivityIndicator color={colors.brand.tealLight} size="small" />
        ) : (
          <UsagePeriodCarousel
            cards={selectedPeriodCards}
            emptyHint={usageEmptyHint}
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent alerts" />
        {activityLoading ? (
          <ActivityIndicator color={colors.brand.tealLight} size="small" />
        ) : (
          <RecentAlertsList alerts={alerts} />
        )}
      </View>

      <ChildPickerSheet
        childrenList={children}
        onAddChild={() => navigation.navigate('Children')}
        onClose={() => setPickerVisible(false)}
        onSelect={setSelectedChildId}
        selectedChildId={selectedChildId}
        visible={pickerVisible}
      />
    </ScreenLayout>
  );
}

function createStyles(_colors: ColorPalette) {
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
  });
}
