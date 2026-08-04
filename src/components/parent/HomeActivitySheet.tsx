import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecentAlertsList } from './RecentAlertsList';
import { useTheme } from '../../context/ThemeContext';
import type { ActivityAlert, ParentActivityStats } from '../../types/parentActivity';
import type { UsageReportSummary, UsageTopApp } from '../../types/appUsage';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

/** Visible height when the sheet is parked (peek). */
export const HOME_ACTIVITY_SHEET_PEEK = 148;

type Props = {
  childName: string | null;
  summary: UsageReportSummary;
  stats: ParentActivityStats;
  topApps: UsageTopApp[];
  alerts: ActivityAlert[];
  loading?: boolean;
  onOpenReports: () => void;
  onOpenChildren: () => void;
  onOpenRules: () => void;
};

export function HomeActivitySheet({
  childName,
  summary,
  stats,
  topApps,
  alerts,
  loading = false,
  onOpenReports,
  onOpenChildren,
  onOpenRules,
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

  useEffect(() => {
    heightAnim.setValue(peekedHeight);
    setExpanded(false);
  }, [peekedHeight, heightAnim]);

  const animateTo = useCallback(
    (toValue: number, nextExpanded: boolean) => {
      setExpanded(nextExpanded);
      Animated.spring(heightAnim, {
        toValue,
        useNativeDriver: false,
        friction: 9,
        tension: 70,
      }).start();
    },
    [heightAnim],
  );

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
          // Drag up (negative dy) grows the sheet.
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
              <Text numberOfLines={1} style={styles.peekSubtitle}>
                {loading
                  ? 'Loading…'
                  : `Today ${summary.todayLabel} · Week ${summary.weekLabel}`}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Collapse sheet' : 'Expand sheet'}
              hitSlop={10}
              onPress={() =>
                animateTo(expanded ? peekedHeight : expandedHeight, !expanded)
              }
              style={({ pressed }) => [
                styles.expandChip,
                pressed && styles.expandChipPressed,
              ]}>
              <Feather
                color={colors.text.brand}
                name={expanded ? 'chevron-down' : 'chevron-up'}
                size={18}
              />
            </Pressable>
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

          <Text style={styles.sectionLabel}>Quick actions</Text>
          <View style={styles.actions}>
            <ActionRow
              colors={colors}
              icon="bar-chart-2"
              label="Full report"
              onPress={onOpenReports}
              styles={styles}
            />
            <ActionRow
              colors={colors}
              icon="slash"
              label="Manage rules"
              onPress={onOpenRules}
              styles={styles}
            />
            <ActionRow
              colors={colors}
              icon="users"
              label="Children"
              onPress={onOpenChildren}
              styles={styles}
            />
          </View>

          <Text style={styles.sectionLabel}>Recent alerts</Text>
          {loading ? (
            <Text style={styles.emptyHint}>Loading alerts…</Text>
          ) : (
            <RecentAlertsList alerts={alerts} />
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function ActionRow({
  colors,
  icon,
  label,
  onPress,
  styles,
}: {
  colors: ColorPalette;
  icon: string;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && styles.actionRowPressed,
      ]}>
      <View style={styles.actionIcon}>
        <Feather color={colors.text.brand} name={icon} size={18} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Feather color={colors.text.placeholder} name="chevron-right" size={18} />
    </Pressable>
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
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      backgroundColor: colors.border.strong,
      borderRadius: radii.pill,
      height: 5,
      marginBottom: spacing.md,
      width: 48,
    },
    peekHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
    },
    peekCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    peekTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 17,
      fontWeight: '700',
    },
    peekSubtitle: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    expandChip: {
      alignItems: 'center',
      backgroundColor: colors.background.accent,
      borderRadius: radii.pill,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    expandChipPressed: {
      opacity: 0.8,
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
      fontSize: 12,
      letterSpacing: 0.4,
      marginTop: spacing.xs,
      textTransform: 'uppercase',
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
    actions: {
      gap: spacing.sm,
    },
    actionRow: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    actionRowPressed: {
      opacity: 0.88,
    },
    actionIcon: {
      alignItems: 'center',
      backgroundColor: colors.background.accent,
      borderRadius: radii.pill,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    actionLabel: {
      ...typography.label,
      color: colors.text.primary,
      flex: 1,
      fontSize: 15,
    },
  });
}
