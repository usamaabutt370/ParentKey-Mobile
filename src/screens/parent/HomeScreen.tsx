import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  ChildPickerSheet,
  ChildSelectorChip,
  HomeActivitySheet,
  HOME_ACTIVITY_SHEET_PEEK,
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
    selectedTopApps: topApps,
    selectedPeriodCards,
    selectedAlerts: alerts,
    loading: activityLoading,
  } = useParentActivityDashboard();
  const [pickerVisible, setPickerVisible] = useState(false);
  const firstName = session?.user.user_metadata?.first_name;
  const parentName =
    typeof firstName === 'string' && firstName.trim().length > 0
      ? firstName.trim()
      : null;
  const selectedName = selectedChild
    ? getChildDisplayName(selectedChild)
    : null;
  const usageEmptyHint =
    Platform.OS === 'ios'
      ? 'App usage sync is not available on iOS. Use Screen Time on the child device for limits and blocking.'
      : 'Usage data appears after the child enables Usage access and syncs.';

  return (
    <View style={styles.root}>
      <ScreenLayout
        safeAreaEdges={['top', 'left', 'right']}
        scrollable
        contentStyle={styles.content}
        style={styles.layout}>
        <View style={styles.topBar}>
          <Text style={screenStyles.brand}>ParentKey</Text>
          {parentName ? (
            <Text numberOfLines={1} style={styles.parentName}>
              {parentName}
            </Text>
          ) : null}
        </View>

        {children.length > 0 ? (
          <ChildSelectorChip
            child={selectedChild}
            disabled={activityLoading && !selectedChild}
            onPress={() => setPickerVisible(true)}
          />
        ) : null}

        {activityLoading ? (
          <ActivityIndicator color={colors.brand.tealLight} size="small" />
        ) : (
          <UsagePeriodCarousel
            cards={selectedPeriodCards}
            emptyHint={usageEmptyHint}
          />
        )}
      </ScreenLayout>

      <HomeActivitySheet
        alerts={alerts}
        childName={selectedName}
        loading={activityLoading}
        stats={stats}
        summary={summary}
        topApps={topApps}
        onOpenChildren={() => navigation.navigate('Children')}
        onOpenReports={() => navigation.navigate('Reports')}
        onOpenRules={() => navigation.navigate('Controls')}
      />

      <ChildPickerSheet
        childrenList={children}
        onAddChild={() => navigation.navigate('Children')}
        onClose={() => setPickerVisible(false)}
        onSelect={setSelectedChildId}
        selectedChildId={selectedChildId}
        visible={pickerVisible}
      />
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    layout: {
      paddingBottom: 0,
    },
    content: {
      gap: spacing.xl,
      // Keep the usage card above the always-visible peek sheet.
      paddingBottom: HOME_ACTIVITY_SHEET_PEEK + spacing.xl,
    },
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    parentName: {
      ...typography.label,
      color: colors.text.primary,
      flexShrink: 1,
      fontSize: 16,
      fontWeight: '600',
      maxWidth: '48%',
      textAlign: 'right',
    },
  });
}
