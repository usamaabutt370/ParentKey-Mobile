import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../AppIcon';
import { AuthButton } from '../AuthButton';
import { useTheme } from '../../context/ThemeContext';
import type { AppBlockRule } from '../../lib/appRules';
import type { ParentActivityStats } from '../../types/parentActivity';
import type { UsageReportSummary, UsageTopApp } from '../../types/appUsage';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

/** Visible height when the sheet is parked (peek). */
export const HOME_ACTIVITY_SHEET_PEEK = 100;

type Props = {
  childName: string | null;
  summary: UsageReportSummary;
  stats: ParentActivityStats;
  topApps: UsageTopApp[];
  blockedRules: AppBlockRule[];
  appIcons?: Map<string, string | null>;
  loading?: boolean;
  /** When false (e.g. left Home), collapse the sheet to peek. */
  screenFocused?: boolean;
  uninstallAllowed?: boolean;
  uninstallUpdating?: boolean;
  showDeviceProtection?: boolean;
  onToggleUninstallAllowed?: (allowed: boolean) => void;
  onManageBlockedApps: () => void;
};

export function HomeActivitySheet({
  childName,
  summary,
  stats,
  topApps,
  blockedRules,
  appIcons,
  loading = false,
  screenFocused = true,
  uninstallAllowed = false,
  uninstallUpdating = false,
  showDeviceProtection = false,
  onToggleUninstallAllowed,
  onManageBlockedApps,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const heading = childName ? `${childName}'s activity` : 'Family activity';
  const topApp = topApps[0] ?? null;

  const expandedHeight = Math.min(windowHeight * 0.78, windowHeight - 96);
  const peekedHeight = HOME_ACTIVITY_SHEET_PEEK + Math.min(insets.bottom, 12);

  const heightAnim = useRef(new Animated.Value(peekedHeight)).current;
  const dragStartHeight = useRef(peekedHeight);
  const peekedRef = useRef(peekedHeight);
  const expandedRef = useRef(expandedHeight);
  peekedRef.current = peekedHeight;
  expandedRef.current = expandedHeight;
  const [expanded, setExpanded] = useState(false);
  const [showAllBlocked, setShowAllBlocked] = useState(false);
  const blockedPreviewLimit = 3;
  const visibleBlockedRules = showAllBlocked
    ? blockedRules
    : blockedRules.slice(0, blockedPreviewLimit);
  const hasMoreBlocked = blockedRules.length > blockedPreviewLimit;

  useEffect(() => {
    heightAnim.setValue(peekedHeight);
    setExpanded(false);
    setShowAllBlocked(false);
  }, [peekedHeight, heightAnim]);

  const animateTo = useCallback(
    (toValue: number, nextExpanded: boolean) => {
      setExpanded(nextExpanded);
      if (!nextExpanded) {
        setShowAllBlocked(false);
      }
      Animated.spring(heightAnim, {
        toValue,
        useNativeDriver: false,
        friction: 9,
        tension: 70,
      }).start();
    },
    [heightAnim],
  );

  useEffect(() => {
    if (!screenFocused) {
      heightAnim.stopAnimation();
      heightAnim.setValue(peekedHeight);
      setExpanded(false);
      setShowAllBlocked(false);
    }
  }, [screenFocused, peekedHeight, heightAnim]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          heightAnim.stopAnimation(value => {
            dragStartHeight.current = value;
          });
        },
        onPanResponderMove: (_event, gesture) => {
          const min = peekedRef.current;
          const max = expandedRef.current;
          const next = Math.min(
            max,
            Math.max(min, dragStartHeight.current - gesture.dy),
          );
          heightAnim.setValue(next);
        },
        onPanResponderRelease: (_event, gesture) => {
          const min = peekedRef.current;
          const max = expandedRef.current;
          const current = Math.min(
            max,
            Math.max(min, dragStartHeight.current - gesture.dy),
          );
          const mid = min + (max - min) * 0.45;
          const flungUp = gesture.vy < -0.85;
          const flungDown = gesture.vy > 0.85;

          if (flungUp || (current >= mid && !flungDown)) {
            animateTo(max, true);
          } else {
            animateTo(min, false);
          }
        },
      }),
    [animateTo, heightAnim],
  );

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      {expanded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Collapse activity sheet"
          onPress={() => animateTo(peekedHeight, false)}
          style={styles.backdrop}
        />
      ) : null}

      <Animated.View style={[styles.sheet, { height: heightAnim }]}>
        <View {...panResponder.panHandlers} style={styles.dragZone}>
          <View style={styles.handle} />
          <View style={styles.peekHeader}>
            <View style={styles.peekCopy}>
              <Text numberOfLines={1} style={styles.peekTitle}>
                {heading}
              </Text>
              {/* <Text numberOfLines={1} style={styles.peekSubtitle}>
                {loading
                  ? 'Loading…'
                  : `Today ${summary.todayLabel} · Week ${summary.weekLabel}`}
              </Text> */}
            </View>
          </View>
        </View>

        <ScrollView
          bounces={expanded}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled
          scrollEnabled={expanded}
          showsVerticalScrollIndicator={expanded}
          style={styles.scroll}>
          <Text style={styles.sectionLabel}>Today</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>
                {loading ? '…' : summary.todayLabel}
              </Text>
              <Text style={styles.summaryKey}>Screen time</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>
                {loading ? '…' : summary.weekLabel}
              </Text>
              <Text style={styles.summaryKey}>This week</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>
                {loading ? '…' : String(stats.activeRulesCount)}
              </Text>
              <Text style={styles.summaryKey}>Active rules</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={[styles.summaryValue, styles.summaryAlert]}>
                {loading ? '…' : String(stats.alertCount)}
              </Text>
              <Text style={styles.summaryKey}>Alerts</Text>
            </View>
          </View>

          {topApp ? (
            <View style={styles.topAppCard}>
              <Feather color={colors.text.brand} name="smartphone" size={18} />
              <View style={styles.topAppCopy}>
                <Text style={styles.topAppEyebrow}>Most used today</Text>
                <Text numberOfLines={1} style={styles.topAppName}>
                  {topApp.name}
                </Text>
              </View>
              <Text style={styles.topAppTime}>{topApp.time}</Text>
            </View>
          ) : (
            <Text style={styles.emptyHint}>
              {loading
                ? 'Loading today’s top apps…'
                : 'No app usage synced for today yet.'}
            </Text>
          )}
          {showDeviceProtection ? (
            <>
              <Text style={styles.sectionLabel}>Device protection</Text>
              <View style={styles.protectionCard}>
                <View style={styles.protectionCopy}>
                  <Text style={styles.protectionTitle}>Allow app uninstall</Text>
                  <Text style={styles.protectionBody}>
                    When on, the child device can deactivate Device Admin and
                    uninstall ParentKey Child.
                  </Text>
                </View>
                <Switch
                  disabled={uninstallUpdating || !onToggleUninstallAllowed}
                  onValueChange={value => onToggleUninstallAllowed?.(value)}
                  trackColor={{
                    false: colors.border.default,
                    true: colors.brand.teal,
                  }}
                  value={uninstallAllowed}
                />
              </View>
            </>
          ) : null}
            <View style={styles.blockedAppsSection}>
              <Text style={styles.sectionLabel}>Blocked apps</Text>
              <View style={styles.manageBlockedButton}>
                <AuthButton
                style={{ width: '100%', height: 40 }}
                  key={blockedRules.length === 0 ? 'block-apps' : 'manage-blocked'}
                  onPress={onManageBlockedApps}
                  title={blockedRules.length === 0 ? 'Block apps' : 'Manage apps'}
                  variant={blockedRules.length === 0 ? 'primary' : 'secondary'}
                />
                </View>
            </View>
          {loading ? (
            <Text style={styles.emptyHint}>Loading blocked apps…</Text>
          ) : blockedRules.length === 0 ? (
            <Text style={styles.emptyHint}>
              No apps are blocked for this child yet.
            </Text>
          ) : (
            <View style={styles.appList}>
              {visibleBlockedRules.map(rule => {
                const displayName = rule.appName ?? rule.packageName;
                return (
                  <View key={rule.id} style={styles.blockedRow}>
                    <AppIcon
                      iconBase64={appIcons?.get(rule.packageName)}
                      name={displayName}
                      packageName={rule.packageName}
                      size={40}
                    />
                    <View style={styles.blockedInfo}>
                      <Text numberOfLines={1} style={styles.blockedName}>
                        {displayName}
                      </Text>
                      <Text numberOfLines={1} style={styles.blockedPackage}>
                        {rule.packageName}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {hasMoreBlocked ? (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setShowAllBlocked(current => !current)}
                  style={({ pressed }) => [
                    styles.showAllButton,
                    pressed && styles.showAllButtonPressed,
                  ]}>
                  <Text style={styles.showAllText}>
                    {showAllBlocked
                      ? 'Show less'
                      : `Show all (${blockedRules.length})`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'flex-end',
      zIndex: 20,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0, 0, 0, 0.28)',
    },
    sheet: {
      backgroundColor: colors.background.primary,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
      paddingBottom: spacing.md,
      width: '100%',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
        },
        android: {
          elevation: 16,
        },
      }),
    },
    dragZone: {
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    handle: {
      alignSelf: 'center',
      backgroundColor: colors.border.strong,
      borderRadius: radii.pill,
      height: 4,
      marginBottom: spacing.md,
      width: 40,
    },
    peekHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    peekCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    peekTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 25,
      fontWeight: '700',
    },
    peekSubtitle: {
      ...typography.caption,
      color: colors.text.secondary,
      fontSize: 11,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      gap: spacing.md,
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.text.secondary,
      fontSize: 15,
      letterSpacing: 0.4,
      marginTop: spacing.xs,
      textTransform: 'uppercase',
    },
    manageBlockedButton: {
      alignItems:'flex-end',
      width: '50%',
      backgroundColor: 'transparent',
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    summaryTile: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexGrow: 1,
      minWidth: '46%',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    summaryValue: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 22,
      lineHeight: 28,
    },
    summaryAlert: {
      color: colors.error,
    },
    summaryKey: {
      ...typography.caption,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    topAppCard: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    topAppCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    topAppEyebrow: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '600',
    },
    topAppName: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    topAppTime: {
      ...typography.caption,
      color: colors.text.secondary,
      fontWeight: '700',
    },
    emptyHint: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    protectionCard: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    protectionCopy: {
      flex: 1,
      gap: spacing.xs,
      minWidth: 0,
    },
    protectionTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    protectionBody: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 18,
    },
    appList: {
      gap: spacing.sm,
    },
    blockedRow: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    blockedInfo: {
      flex: 1,
      gap: spacing.xs,
      minWidth: 0,
    },
    blockedName: {
      ...typography.label,
      color: colors.text.primary,
    },
    blockedPackage: {
      ...typography.caption,
      color: colors.text.placeholder,
    },
    showAllButton: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.xs,
    },
    showAllButtonPressed: {
      opacity: 0.7,
    },
    showAllText: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    blockedAppsSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  });
}
