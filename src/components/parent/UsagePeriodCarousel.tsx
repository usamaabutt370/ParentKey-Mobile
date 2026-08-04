import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import { AppIcon } from '../AppIcon';
import { useTheme } from '../../context/ThemeContext';
import {
  buildHourlyChartBars,
  formatUsageAxisTick,
  formatUsageDurationLong,
  getUsageAxisMaxSeconds,
} from '../../lib/appUsage';
import type {
  UsagePeriodCard,
  UsagePeriodChartBar,
  UsageTopApp,
} from '../../types/appUsage';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = {
  cards: UsagePeriodCard[];
  emptyHint?: string;
};

const PERIOD_CARD_PREVIEW_LIMIT = 3;
/** Collapsed card height — keeps empty and filled cards visually aligned. */
const PERIOD_CARD_HEIGHT = 516;
/** Extra height added when “All apps” is open so the list can scroll. */
const PERIOD_CARD_EXPAND_EXTRA = 100;

const HOUR_SLOT_LABELS = [
  { hour: 0, label: '0:00 AM' },
  { hour: 6, label: '6:00 AM' },
  { hour: 12, label: '12:00 PM' },
  { hour: 18, label: '6:00 PM' },
] as const;

const CHART_BAR_COLOR = '#F5C542';
const CHART_SELECTED_PILL = 'rgba(255,255,255,0.18)';

/** Renders "2 h 15 min" with emphatic digits like Screen Time. */
function TotalDurationLabel({ value }: { value: string }) {
  const styles = useMemo(() => createCardStyles(), []);
  const parts = value.split(/(\d+)/).filter(Boolean);

  return (
    <Text style={styles.total}>
      {parts.map((part, index) => {
        const isNumber = /^\d+$/.test(part);
        return (
          <Text
            key={`${part}-${index}`}
            style={isNumber ? styles.totalNumber : styles.totalUnit}>
            {isNumber ? part : part}
          </Text>
        );
      })}
    </Text>
  );
}

function PeriodChart({
  bars,
  mode,
  focusedHour,
  onSelectHour,
  scaleHint,
}: {
  bars: UsagePeriodCard['chartBars'];
  mode: UsagePeriodCard['chartMode'];
  focusedHour: number | null;
  onSelectHour?: (hour: number) => void;
  scaleHint?: string;
}) {
  const styles = useMemo(() => createChartStyles(), []);
  const topSeconds = Math.max(...bars.map(bar => bar.seconds), 0);
  const axisMaxSeconds = getUsageAxisMaxSeconds(topSeconds);
  const midSeconds = Math.round(axisMaxSeconds / 2);
  const hasBars = bars.some(bar => bar.seconds > 0);
  const isHourly = mode === 'hourly';

  const displayBars: UsagePeriodChartBar[] = hasBars
    ? bars
    : isHourly
      ? Array.from({ length: 24 }, (_, hour): UsagePeriodChartBar => ({
          key: `empty-${hour}`,
          label: '',
          seconds: 0,
          display: '',
          hour,
        }))
      : Array.from({ length: 7 }, (_, index): UsagePeriodChartBar => ({
          key: `empty-${index}`,
          label: '',
          seconds: 0,
          display: '',
        }));

  return (
    <View style={styles.chartWrap}>
      {isHourly ? (
        <Text style={styles.scaleHint}>
          {scaleHint ?? 'Each bar = usage in that hour'}
        </Text>
      ) : null}
      <View style={styles.chartRow}>
        <View style={styles.plot}>
          <View pointerEvents="none" style={styles.gridLines}>
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
          </View>

          <View style={styles.barsRow}>
            {displayBars.map(bar => {
              const ratio =
                axisMaxSeconds > 0 ? bar.seconds / axisMaxSeconds : 0;
              const height = bar.seconds > 0 ? Math.max(ratio * 100, 4) : 0;
              const hour = bar.hour;
              const isFocused =
                isHourly &&
                hour != null &&
                focusedHour != null &&
                hour === focusedHour;

              return (
                <Pressable
                  key={bar.key}
                  accessibilityRole="button"
                  disabled={!isHourly || hour == null}
                  onPress={() => {
                    if (hour != null) {
                      onSelectHour?.(hour);
                    }
                  }}
                  style={styles.barColumn}>
                  {isFocused ? (
                    <View pointerEvents="none" style={styles.focusPill} />
                  ) : null}
                  <View style={styles.barTrack}>
                    {height > 0 ? (
                      <View style={[styles.barFill, { height: `${height}%` }]} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.yAxis}>
          <Text style={styles.yLabel}>{formatUsageAxisTick(axisMaxSeconds)}</Text>
          <Text style={styles.yLabel}>{formatUsageAxisTick(midSeconds)}</Text>
          <Text style={styles.yLabel}>0</Text>
        </View>
      </View>

      {isHourly ? (
        <View style={styles.xAxis}>
          {HOUR_SLOT_LABELS.map((slot, index) => (
            <Text
              key={slot.hour}
              numberOfLines={1}
              style={[
                styles.xLabel,
                index === 0 && styles.xLabelStart,
                index === HOUR_SLOT_LABELS.length - 1 && styles.xLabelEnd,
              ]}>
              {slot.label}
            </Text>
          ))}
        </View>
      ) : (
        <View style={styles.dayLabels}>
          {displayBars.map(bar => (
            <Text key={bar.key} numberOfLines={1} style={styles.dayLabel}>
              {bar.label || ' '}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function AppRow({
  app,
  showBorder,
  selected,
  onPress,
}: {
  app: UsageTopApp;
  showBorder: boolean;
  selected: boolean;
  onPress?: () => void;
}) {
  const styles = useMemo(() => createCardStyles(), []);
  const trackable = app.hasTracking === true;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!trackable || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.appRow,
        showBorder && styles.appRowBorder,
        selected && styles.appRowSelected,
        pressed && trackable && styles.appRowPressed,
      ]}>
      <AppIcon
        iconBase64={app.iconBase64}
        name={app.name}
        packageName={app.packageName}
        size={32}
      />
      <View style={styles.appNameWrap}>
        <Text numberOfLines={1} style={styles.appName}>
          {app.name}
        </Text>
        {trackable ? (
          <View style={styles.trackingBadge}>
            <Feather color="rgba(255,255,255,0.85)" name="clock" size={11} />
          </View>
        ) : null}
      </View>
      <Text style={styles.appTime}>{app.time}</Text>
    </Pressable>
  );
}

function PeriodCardView({
  card,
  width,
  emptyHint,
}: {
  card: UsagePeriodCard;
  width: number;
  emptyHint?: string;
}) {
  const styles = useMemo(() => createCardStyles(), []);
  const [expanded, setExpanded] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [focusedHour, setFocusedHour] = useState<number | null>(() =>
    card.chartMode === 'hourly' && card.id === 'today'
      ? new Date().getHours()
      : null,
  );
  const previewApps = card.apps.slice(0, PERIOD_CARD_PREVIEW_LIMIT);
  const canExpand = card.apps.length > PERIOD_CARD_PREVIEW_LIMIT;
  const cardHeight = expanded
    ? PERIOD_CARD_HEIGHT + PERIOD_CARD_EXPAND_EXTRA
    : PERIOD_CARD_HEIGHT;

  const chartBars = useMemo(() => {
    if (card.chartMode !== 'hourly') {
      return card.chartBars;
    }
    return buildHourlyChartBars(card.hourlyRecords, selectedPackage);
  }, [card.chartBars, card.chartMode, card.hourlyRecords, selectedPackage]);

  const selectedApp = selectedPackage
    ? card.apps.find(app => app.packageName === selectedPackage)
    : null;
  const totalLabel = selectedApp
    ? formatUsageDurationLong(selectedApp.foregroundSeconds)
    : card.totalLabel;
  const chartSeconds = chartBars.reduce((sum, bar) => sum + bar.seconds, 0);
  const hourlyGapHint =
    card.chartMode === 'hourly' &&
    selectedApp != null &&
    selectedApp.foregroundSeconds >= 60 &&
    chartSeconds < selectedApp.foregroundSeconds * 0.2
      ? 'Day total is available, but hour-by-hour detail hasn’t synced for this app yet'
      : undefined;

  useEffect(() => {
    setExpanded(false);
    setSelectedPackage(null);
    setFocusedHour(
      card.chartMode === 'hourly' && card.id === 'today'
        ? new Date().getHours()
        : null,
    );
  }, [card.id, card.chartMode]);

  const toggleApp = (app: UsageTopApp) => {
    if (!app.hasTracking || card.chartMode !== 'hourly') {
      return;
    }
    setSelectedPackage(current =>
      current === app.packageName ? null : app.packageName,
    );
  };

  return (
    <LinearGradient
      colors={['#0F766E', '#115E59', '#0B3B44']}
      end={{ x: 0.2, y: 1 }}
      start={{ x: 0.1, y: 0 }}
      style={[styles.card, { width, height: cardHeight }]}>
      <Text style={styles.title}>{card.title}</Text>
      <TotalDurationLabel value={totalLabel} />

      <PeriodChart
        bars={chartBars}
        focusedHour={focusedHour}
        mode={card.chartMode}
        scaleHint={hourlyGapHint}
        onSelectHour={hour =>
          setFocusedHour(current => (current === hour ? null : hour))
        }
      />

      <View style={styles.appSection}>
        {card.apps.length > 0 ? (
          <>
            {expanded ? (
              <FlatList
                data={card.apps}
                keyExtractor={item => item.packageName}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                style={styles.appScroll}
                contentContainerStyle={styles.appScrollContent}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item, index }) => (
                  <AppRow
                    app={item}
                    selected={selectedPackage === item.packageName}
                    showBorder={index < card.apps.length - 1}
                    onPress={
                      card.chartMode === 'hourly'
                        ? () => toggleApp(item)
                        : undefined
                    }
                  />
                )}
              />
            ) : (
              <View style={styles.appList}>
                {previewApps.map((app, index) => (
                  <AppRow
                    key={app.packageName}
                    app={app}
                    selected={selectedPackage === app.packageName}
                    showBorder={index < previewApps.length - 1}
                    onPress={
                      card.chartMode === 'hourly'
                        ? () => toggleApp(app)
                        : undefined
                    }
                  />
                ))}
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={!canExpand && !expanded}
              onPress={() => setExpanded(current => !current)}
              style={({ pressed }) => [
                styles.moreAppsButton,
                pressed && (canExpand || expanded) && styles.moreAppsButtonPressed,
                !canExpand && !expanded && styles.moreAppsButtonDisabled,
              ]}>
              <Text style={styles.moreApps}>
                {expanded
                  ? 'Show less'
                  : canExpand
                    ? `${card.moreAppsCount} more apps`
                    : 'All apps'}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.emptyText}>{emptyHint ?? card.emptyMessage}</Text>
        )}
      </View>
    </LinearGradient>
  );
}

type LoopItem = {
  key: string;
  card: UsagePeriodCard;
  logicalIndex: number;
};

/** Enough copies that normal swiping never hits a jump; we only recenter near the ends. */
const LOOP_COPIES = 40;
const RECENTER_EDGE_COPIES = 3;

export function UsagePeriodCarousel({ cards, emptyHint }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createCarouselStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const sidePadding = spacing.lg;
  const cardGap = spacing.md;
  const peek = spacing.lg;
  const cardWidth = Math.max(windowWidth - sidePadding * 2 - peek, 280);
  const itemStride = cardWidth + cardGap;
  const listRef = useRef<FlatList<LoopItem>>(null);
  const isJumpingRef = useRef(false);
  const [activeLogicalIndex, setActiveLogicalIndex] = useState(0);
  const hasLoop = cards.length > 1;
  const cardCount = cards.length;

  const loopedData = useMemo<LoopItem[]>(() => {
    if (cardCount === 0) {
      return [];
    }

    if (!hasLoop) {
      return cards.map((card, logicalIndex) => ({
        key: card.id,
        card,
        logicalIndex,
      }));
    }

    const copies: LoopItem[] = [];
    for (let copy = 0; copy < LOOP_COPIES; copy += 1) {
      for (let logicalIndex = 0; logicalIndex < cardCount; logicalIndex += 1) {
        const card = cards[logicalIndex];
        copies.push({
          key: `${copy}-${card.id}`,
          card,
          logicalIndex,
        });
      }
    }
    return copies;
  }, [cards, cardCount, hasLoop]);

  const middleCopy = Math.floor(LOOP_COPIES / 2);
  const initialIndex = hasLoop ? middleCopy * cardCount : 0;

  useEffect(() => {
    if (loopedData.length === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: initialIndex * itemStride,
        animated: false,
      });
      setActiveLogicalIndex(0);
    });

    return () => cancelAnimationFrame(frame);
  }, [initialIndex, itemStride, loopedData.length]);

  const getItemLayout = (
    _: ArrayLike<LoopItem> | null | undefined,
    index: number,
  ) => ({
    length: itemStride,
    offset: index * itemStride,
    index,
  });

  const snapToOffsets = useMemo(
    () => loopedData.map((_, index) => index * itemStride),
    [itemStride, loopedData],
  );

  const maybeRecenter = (index: number) => {
    if (!hasLoop || cardCount === 0 || isJumpingRef.current) {
      return index;
    }

    const copyIndex = Math.floor(index / cardCount);
    const logicalIndex = index % cardCount;
    const nearStart = copyIndex < RECENTER_EDGE_COPIES;
    const nearEnd = copyIndex >= LOOP_COPIES - RECENTER_EDGE_COPIES;

    if (!nearStart && !nearEnd) {
      return index;
    }

    const targetIndex = middleCopy * cardCount + logicalIndex;
    if (targetIndex === index) {
      return index;
    }

    isJumpingRef.current = true;
    listRef.current?.scrollToOffset({
      offset: targetIndex * itemStride,
      animated: false,
    });
    requestAnimationFrame(() => {
      isJumpingRef.current = false;
    });

    return targetIndex;
  };

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (isJumpingRef.current) {
      return;
    }

    const offset = event.nativeEvent.contentOffset.x;
    const rawIndex = Math.round(offset / itemStride);
    const clamped = Math.min(
      Math.max(rawIndex, 0),
      Math.max(loopedData.length - 1, 0),
    );
    const settledIndex = maybeRecenter(clamped);
    setActiveLogicalIndex(cardCount > 0 ? settledIndex % cardCount : 0);
  };

  if (cards.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={loopedData}
        horizontal
        decelerationRate="fast"
        disableIntervalMomentum
        getItemLayout={getItemLayout}
        initialNumToRender={Math.max(cardCount * 3, 9)}
        initialScrollIndex={hasLoop ? initialIndex : 0}
        keyExtractor={item => item.key}
        maxToRenderPerBatch={Math.max(cardCount * 2, 6)}
        nestedScrollEnabled
        onMomentumScrollEnd={onMomentumScrollEnd}
        removeClippedSubviews={false}
        renderItem={({ item }) => (
          <View style={{ width: itemStride }}>
            <PeriodCardView
              card={item.card}
              emptyHint={emptyHint}
              width={cardWidth}
            />
          </View>
        )}
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapToOffsets}
        windowSize={7}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: sidePadding },
        ]}
      />
      <View style={styles.dots}>
        {cards.map((card, index) => (
          <View
            key={card.id}
            style={[
              styles.dot,
              index === activeLogicalIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function createCarouselStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
      marginHorizontal: -spacing.lg,
      marginTop: 20,
    },
    listContent: {
      paddingVertical: 0,
    },
    dots: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    dot: {
      backgroundColor: colors.border.default,
      borderRadius: radii.pill,
      height: 6,
      width: 6,
    },
    dotActive: {
      backgroundColor: colors.brand.tealLight,
      width: 18,
    },
  });
}

function createCardStyles() {
  return StyleSheet.create({
    card: {
      borderRadius: radii.lg,
      gap: spacing.md,
      padding: spacing.lg,
      paddingBottom: spacing.lg + spacing.sm,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    title: {
      ...typography.label,
      color: 'rgba(255,255,255,0.88)',
      fontSize: 15,
      fontWeight: '500',
    },
    total: {
      ...typography.title,
      color: '#FFFFFF',
      fontSize: 34,
      fontWeight: '700',
      lineHeight: 40,
    },
    totalNumber: {
      color: '#FFFFFF',
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    totalUnit: {
      color: 'rgba(255,255,255,0.92)',
      fontSize: 22,
      fontWeight: '500',
    },
    appList: {
      flexGrow: 0,
      gap: 0,
    },
    appSection: {
      flex: 1,
      minHeight: 0,
    },
    appScroll: {
      flex: 1,
    },
    appScrollContent: {
      flexGrow: 1,
      paddingBottom: spacing.xs,
    },
    appRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      minHeight: 32 + (spacing.sm + 2) * 2,
      paddingVertical: spacing.sm + 2,
    },
    appRowBorder: {
      borderBottomColor: 'rgba(255,255,255,0.14)',
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    appRowSelected: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: radii.sm,
      marginHorizontal: -spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    appRowPressed: {
      opacity: 0.85,
    },
    appNameWrap: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      minWidth: 0,
    },
    appName: {
      ...typography.label,
      color: '#FFFFFF',
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '500',
    },
    trackingBadge: {
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: radii.pill,
      height: 20,
      justifyContent: 'center',
      width: 20,
    },
    appTime: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '600',
    },
    moreAppsButton: {
      alignSelf: 'flex-start',
      flexShrink: 0,
      marginTop: spacing.sm,
      paddingBottom: spacing.xs,
      paddingTop: spacing.xs,
    },
    moreAppsButtonPressed: {
      opacity: 0.7,
    },
    moreAppsButtonDisabled: {
      opacity: 0.55,
    },
    moreApps: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    emptyText: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.75)',
      lineHeight: 20,
    },
  });
}

function createChartStyles() {
  return StyleSheet.create({
    chartWrap: {
      gap: spacing.xs,
      height: 184,
      marginTop: spacing.xs,
    },
    scaleHint: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 11,
      fontWeight: '500',
      marginBottom: 2,
    },
    chartRow: {
      flex: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      minHeight: 0,
    },
    plot: {
      flex: 1,
      minWidth: 0,
      position: 'relative',
    },
    gridLines: {
      bottom: 0,
      height: '100%',
      justifyContent: 'space-between',
      left: 0,
      position: 'absolute',
      right: 0,
    },
    gridLine: {
      borderStyle: 'dashed',
      borderTopColor: 'rgba(255,255,255,0.22)',
      borderTopWidth: StyleSheet.hairlineWidth,
      width: '100%',
    },
    barsRow: {
      alignItems: 'flex-end',
      flex: 1,
      flexDirection: 'row',
      gap: 2,
      height: '100%',
      justifyContent: 'space-between',
      paddingBottom: 2,
    },
    barColumn: {
      alignItems: 'center',
      flex: 1,
      height: '100%',
      justifyContent: 'flex-end',
      position: 'relative',
    },
    focusPill: {
      backgroundColor: CHART_SELECTED_PILL,
      borderRadius: radii.pill,
      bottom: 0,
      left: -1.5,
      position: 'absolute',
      right: -1.5,
      top: 0,
    },
    barTrack: {
      height: '100%',
      justifyContent: 'flex-end',
      overflow: 'hidden',
      width: '80%',
      maxWidth: 10,
      minWidth: 5,
    },
    barFill: {
      backgroundColor: CHART_BAR_COLOR,
      borderRadius: 2.5,
      width: '100%',
    },
    yAxis: {
      height: '100%',
      justifyContent: 'space-between',
      paddingVertical: 0,
      width: 34,
    },
    yLabel: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: 10,
      fontWeight: '500',
      textAlign: 'right',
    },
    xAxis: {
      flexDirection: 'row',
      // height: 16,
      justifyContent: 'space-between',
      marginRight: 34 + spacing.sm,
    },
    xLabel: {
      color: 'rgba(255,255,255,0.72)',
      flex: 1,
      fontSize: 10,
      fontWeight: '500',
      textAlign: 'center',
    },
    xLabelStart: {
      textAlign: 'left',
    },
    xLabelEnd: {
      textAlign: 'right',
    },
    dayLabels: {
      flexDirection: 'row',
      gap: 1.5,
      height: 16,
      marginRight: 34 + spacing.sm,
    },
    dayLabel: {
      color: 'rgba(255,255,255,0.72)',
      flex: 1,
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
