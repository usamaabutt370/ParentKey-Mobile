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
import { AppIcon } from '../AppIcon';
import { useTheme } from '../../context/ThemeContext';
import type { UsagePeriodCard } from '../../types/appUsage';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = {
  cards: UsagePeriodCard[];
  emptyHint?: string;
};

function PeriodChart({
  bars,
  colors,
}: {
  bars: UsagePeriodCard['chartBars'];
  colors: ColorPalette;
}) {
  const styles = useMemo(() => createChartStyles(colors), [colors]);
  const maxSeconds = Math.max(...bars.map(bar => bar.seconds), 1);

  if (bars.every(bar => bar.seconds <= 0)) {
    return (
      <View style={styles.emptyChart}>
        <View style={styles.emptyChartLine} />
        <View style={styles.emptyChartLine} />
        <View style={styles.emptyChartLine} />
      </View>
    );
  }

  return (
    <View style={styles.chart}>
      {bars.map(bar => {
        const height =
          bar.seconds > 0 ? Math.max((bar.seconds / maxSeconds) * 100, 8) : 0;

        return (
          <View key={bar.key} style={styles.barColumn}>
            <View style={styles.barTrack}>
              {height > 0 ? (
                <View style={[styles.barFill, { height: `${height}%` }]} />
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.barLabel}>
              {bar.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const PERIOD_CARD_PREVIEW_LIMIT = 3;

function PeriodCardView({
  card,
  width,
  emptyHint,
}: {
  card: UsagePeriodCard;
  width: number;
  emptyHint?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createCardStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const hasUsage = card.totalSeconds > 0;
  const visibleApps = expanded
    ? card.apps
    : card.apps.slice(0, PERIOD_CARD_PREVIEW_LIMIT);
  const hiddenCount = Math.max(0, card.apps.length - PERIOD_CARD_PREVIEW_LIMIT);

  // Reset when the carousel slides to a different period card.
  useEffect(() => {
    setExpanded(false);
  }, [card.id]);

  return (
    <LinearGradient
      colors={['#0F766E', '#115E59', '#0B3B44']}
      end={{ x: 0.2, y: 1 }}
      start={{ x: 0.1, y: 0 }}
      style={[styles.card, { width }]}>
      <Text style={styles.title}>{card.title}</Text>
      <Text style={styles.total}>{card.totalLabel}</Text>

      <PeriodChart bars={card.chartBars} colors={colors} />

      {hasUsage ? (
        <View style={styles.appList}>
          {visibleApps.map((app, index) => (
            <View
              key={app.packageName}
              style={[
                styles.appRow,
                index < visibleApps.length - 1 && styles.appRowBorder,
              ]}>
              <AppIcon name={app.name} packageName={app.packageName} size={32} />
              <Text numberOfLines={1} style={styles.appName}>
                {app.name}
              </Text>
              <Text style={styles.appTime}>{app.time}</Text>
            </View>
          ))}
          {hiddenCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(current => !current)}
              style={({ pressed }) => [
                styles.moreAppsButton,
                pressed && styles.moreAppsButtonPressed,
              ]}>
              <Text style={styles.moreApps}>
                {expanded
                  ? 'Show less'
                  : `${hiddenCount} more app${hiddenCount === 1 ? '' : 's'}`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text style={styles.emptyText}>{emptyHint ?? card.emptyMessage}</Text>
      )}
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
        horizontal
        data={loopedData}
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
      gap: spacing.md,
      // Bleed to screen edges so cards can peek; parent section may have padding
      marginHorizontal: -spacing.lg,
    },
    listContent: {
      paddingVertical: spacing.xs,
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

function createCardStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: radii.lg,
      gap: spacing.md,
      overflow: 'hidden',
      padding: spacing.lg,
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
      lineHeight: 40,
    },
    appList: {
      gap: 0,
      marginTop: spacing.xs,
    },
    appRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    appRowBorder: {
      borderBottomColor: 'rgba(255,255,255,0.14)',
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    appName: {
      ...typography.label,
      color: '#FFFFFF',
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
    },
    appTime: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '600',
    },
    moreAppsButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
    },
    moreAppsButtonPressed: {
      opacity: 0.7,
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
      marginTop: spacing.xs,
    },
  });
}

function createChartStyles(_colors: ColorPalette) {
  return StyleSheet.create({
    chart: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: 6,
      height: 120,
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    barColumn: {
      alignItems: 'center',
      flex: 1,
      gap: spacing.xs,
      justifyContent: 'flex-end',
    },
    barTrack: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: radii.sm,
      height: 88,
      justifyContent: 'flex-end',
      overflow: 'hidden',
      width: '100%',
    },
    barFill: {
      backgroundColor: '#FBBF24',
      borderRadius: radii.sm,
      width: '100%',
    },
    barLabel: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 9,
      fontWeight: '600',
      textAlign: 'center',
      width: '100%',
    },
    emptyChart: {
      gap: spacing.md,
      height: 120,
      justifyContent: 'center',
      paddingVertical: spacing.md,
    },
    emptyChartLine: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: radii.pill,
      height: 1,
      width: '100%',
    },
  });
}
