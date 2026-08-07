import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { useTheme } from '../context/ThemeContext';
import type { ColorPalette } from '../theme/colors';
import { radii, spacing, typography } from '../theme';

export const HORIZONTAL_APPS_PREVIEW_LIMIT = 3;

/** Leaves a visible sliver of the next card so scrolling is obvious. */
const SCROLL_PEEK = 40;
const CARD_GAP = spacing.sm;
const MIN_CARD_WIDTH = 88;
const FALLBACK_CARD_WIDTH = 108;

export type HorizontalAppItem = {
  id: string;
  packageName: string;
  name: string;
  subtitle?: string;
  iconUri?: string | null;
  iconBase64?: string | null;
};

type HorizontalAppsStripProps = {
  title: string;
  items: HorizontalAppItem[];
  emptyMessage?: string;
  countLabel?: string;
  /** Replaces the count label on the right side of the title row. */
  headerRight?: ReactNode;
  onPressItem?: (item: HorizontalAppItem) => void;
  accentSubtitle?: boolean;
};

function AppCard({
  item,
  onPress,
  accentSubtitle,
  width,
}: {
  item: HorizontalAppItem;
  onPress?: () => void;
  accentSubtitle?: boolean;
  width: number;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createCardStyles(colors), [colors]);

  const content = (
    <>
      <AppIcon
        iconBase64={item.iconBase64}
        iconUri={item.iconUri}
        name={item.name}
        packageName={item.packageName}
        size={44}
      />
      <Text numberOfLines={1} style={styles.appName}>
        {item.name}
      </Text>
      {item.subtitle ? (
        <Text
          numberOfLines={1}
          style={[
            styles.appSubtitle,
            accentSubtitle && styles.appSubtitleAccent,
          ]}>
          {item.subtitle}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { width },
          pressed && styles.cardPressed,
        ]}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.card, { width }]}>{content}</View>;
}

function computeCardWidth(stripWidth: number, needsPeek: boolean): number {
  if (stripWidth <= 0) {
    return FALLBACK_CARD_WIDTH;
  }

  if (!needsPeek) {
    return Math.max(
      MIN_CARD_WIDTH,
      Math.floor(
        (stripWidth - CARD_GAP * (HORIZONTAL_APPS_PREVIEW_LIMIT - 1)) /
          HORIZONTAL_APPS_PREVIEW_LIMIT,
      ),
    );
  }

  // Fit ~2.7 cards so the next item peeks in from the right.
  return Math.max(
    MIN_CARD_WIDTH,
    Math.floor(
      (stripWidth -
        CARD_GAP * (HORIZONTAL_APPS_PREVIEW_LIMIT - 1) -
        SCROLL_PEEK) /
        HORIZONTAL_APPS_PREVIEW_LIMIT,
    ),
  );
}

export function HorizontalAppsStrip({
  title,
  items,
  emptyMessage,
  countLabel,
  headerRight,
  onPressItem,
  accentSubtitle = true,
}: HorizontalAppsStripProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showAll, setShowAll] = useState(false);
  const [stripWidth, setStripWidth] = useState(0);
  const listRef = useRef<ScrollView>(null);

  useEffect(() => {
    setShowAll(false);
  }, [items]);

  useEffect(() => {
    if (showAll) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [showAll, items.length]);

  const previewItems = items.slice(0, HORIZONTAL_APPS_PREVIEW_LIMIT);
  const visibleItems = showAll ? items : previewItems;
  const hiddenCount = Math.max(0, items.length - HORIZONTAL_APPS_PREVIEW_LIMIT);
  const showToggle = hiddenCount > 0 || showAll;
  const scrollChildCount = visibleItems.length + (showToggle ? 1 : 0);
  const needsPeek = scrollChildCount > HORIZONTAL_APPS_PREVIEW_LIMIT;
  const cardWidth = computeCardWidth(stripWidth, needsPeek);
  const resolvedCountLabel =
    countLabel ?? (items.length > 0 ? `${items.length} apps` : undefined);

  const handleStripLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== stripWidth) {
      setStripWidth(nextWidth);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, headerRight ? styles.titleShrink : null]}>
          {title}
        </Text>
        {headerRight ??
          (resolvedCountLabel ? (
            <Text style={styles.countLabel}>{resolvedCountLabel}</Text>
          ) : null)}
      </View>

      {items.length === 0 ? (
        emptyMessage ? <Text style={styles.hint}>{emptyMessage}</Text> : null
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.horizontalContent,
            needsPeek && styles.horizontalContentPeek,
          ]}
          horizontal
          onContentSizeChange={() => {
            if (!showAll) {
              listRef.current?.scrollTo({ x: 0, y: 0, animated: false });
            }
          }}
          onLayout={handleStripLayout}
          ref={listRef}
          showsHorizontalScrollIndicator={false}>
          {visibleItems.map(item => (
            <AppCard
              accentSubtitle={accentSubtitle}
              item={item}
              key={item.id}
              onPress={
                onPressItem
                  ? () => {
                      onPressItem(item);
                    }
                  : undefined
              }
              width={cardWidth}
            />
          ))}
          {showToggle ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAll(current => !current)}
              style={({ pressed }) => [
                styles.showAllCard,
                { width: cardWidth },
                pressed && styles.showAllPressed,
              ]}>
              <Text style={styles.showAllText}>
                {showAll ? 'Show less' : 'Show all'}
              </Text>
              {!showAll ? (
                <Text style={styles.showAllCount}>+{hiddenCount}</Text>
              ) : null}
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function createCardStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
    },
    cardPressed: {
      opacity: 0.85,
    },
    appName: {
      ...typography.caption,
      color: colors.text.primary,
      fontWeight: '600',
      textAlign: 'center',
      width: '100%',
    },
    appSubtitle: {
      ...typography.caption,
      color: colors.text.secondary,
      fontWeight: '600',
      textAlign: 'center',
      width: '100%',
    },
    appSubtitleAccent: {
      color: colors.text.brand,
      fontWeight: '700',
    },
  });
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    section: {
      gap: spacing.md,
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    title: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
    },
    titleShrink: {
      flexShrink: 1,
      marginRight: spacing.sm,
    },
    countLabel: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    hint: {
      ...typography.body,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    horizontalContent: {
      alignItems: 'stretch',
      gap: CARD_GAP,
    },
    horizontalContentPeek: {
      // Extra room so the last peeked card isn’t clipped flush to the edge.
      paddingRight: SCROLL_PEEK,
    },
    showAllCard: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: 108,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
    },
    showAllPressed: {
      opacity: 0.7,
    },
    showAllText: {
      ...typography.label,
      color: colors.text.brand,
      fontSize: 14,
      textAlign: 'center',
    },
    showAllCount: {
      ...typography.caption,
      color: colors.text.secondary,
      fontWeight: '600',
    },
  });
}
