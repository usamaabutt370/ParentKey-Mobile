import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
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
import { getChildDisplayName, setChildUninstallAllowed } from '../../lib/children';
import type { ParentTabParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type HomeNavigation = BottomTabNavigationProp<ParentTabParamList, 'Home'>;

export function ParentHomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const isFocused = useIsFocused();
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
    selectedBlockedRules,
    selectedAppIcons,
    patchChildUninstallAllowed,
    loading: activityLoading,
  } = useParentActivityDashboard();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [updatingUninstall, setUpdatingUninstall] = useState(false);
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

  const handleManageBlockedApps = useCallback(() => {
    if (!selectedChildId) {
      navigation.navigate('Controls');
      return;
    }

    navigation.navigate('Controls', {
      screen: 'SelectApps',
      params: { mode: 'block', childId: selectedChildId },
    });
  }, [navigation, selectedChildId]);

  const handleToggleUninstallAllowed = useCallback(
    (allowed: boolean) => {
      const parentId = session?.user.id;
      if (!parentId || !selectedChildId || !selectedChild) {
        return;
      }

      const childId = selectedChildId;
      const previous = selectedChild.uninstallAllowed;

      const applyChange = async () => {
        setUpdatingUninstall(true);
        patchChildUninstallAllowed(childId, allowed);

        const result = await setChildUninstallAllowed({
          parentId,
          childId,
          allowed,
        });

        setUpdatingUninstall(false);

        if (!result.ok) {
          patchChildUninstallAllowed(childId, previous);
          Alert.alert('Could not update setting', result.message);
        }
      };

      if (allowed) {
        Alert.alert(
          'Allow uninstall?',
          'This lets the child device turn off uninstall protection so ParentKey Child can be removed. Turn this off again when you want protection restored.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Allow',
              style: 'destructive',
              onPress: () => {
                void applyChange();
              },
            },
          ],
        );
        return;
      }

      void applyChange();
    },
    [
      patchChildUninstallAllowed,
      selectedChild,
      selectedChildId,
      session?.user.id,
    ],
  );

  return (
    <View style={styles.root}>
      <ScreenLayout
        safeAreaEdges={['top', 'left', 'right']}
        scrollable
        contentStyle={styles.content}
        style={styles.layout}>
        <View style={styles.topBar}>
          {children.length > 0 ? (
            <View style={styles.childSlot}>
              <ChildSelectorChip
                child={selectedChild}
                disabled={activityLoading && !selectedChild}
                onPress={() => setPickerVisible(true)}
              />
            </View>
          ) : (
            <View style={styles.topBarSpacer} />
          )}
          <View style={styles.brandBlock}>
            <Text style={[screenStyles.brand, styles.brandText]}>ParentKey</Text>
            {parentName ? (
              <Text numberOfLines={1} style={styles.parentName}>
                {parentName}
              </Text>
            ) : null}
          </View>
        </View>

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
        appIcons={selectedAppIcons}
        blockedRules={selectedBlockedRules}
        childName={selectedName}
        loading={activityLoading}
        screenFocused={isFocused}
        showDeviceProtection={Boolean(selectedChild)}
        stats={stats}
        summary={summary}
        topApps={topApps}
        uninstallAllowed={selectedChild?.uninstallAllowed === true}
        uninstallUpdating={updatingUninstall}
        onManageBlockedApps={handleManageBlockedApps}
        onToggleUninstallAllowed={handleToggleUninstallAllowed}
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
      paddingTop: spacing.xs,
    },
    content: {
      gap: spacing.sm,
      // Keep the usage card above the always-visible peek sheet.
      paddingBottom: HOME_ACTIVITY_SHEET_PEEK + spacing.lg,
      paddingTop: 0,
    },
    topBar: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
      marginBottom: 0,
    },
    topBarSpacer: {
      flex: 1,
    },
    childSlot: {
      flex: 1,
      minWidth: 0,
      paddingRight: spacing.sm,
    },
    brandBlock: {
      alignItems: 'flex-end',
      flexShrink: 0,
      gap: 0,
      maxWidth: '42%',
      marginTop: 15,
    },
    brandText: {
      fontSize: 22,
      lineHeight: 26,
      textAlign: 'right',
    },
    parentName: {
      ...typography.caption,
      color: colors.text.primary,
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 16,
      textAlign: 'right',
    },
  });
}
