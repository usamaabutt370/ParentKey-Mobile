import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { useTheme } from '../context/ThemeContext';
import type { ColorPalette } from '../theme/colors';
import { radii, spacing, typography } from '../theme';

export const HORIZONTAL_APPS_PREVIEW_LIMIT = 3;

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
  onPressItem?: (item: HorizontalAppItem) => void;
  accentSubtitle?: boolean;
};

function AppCard({
  item,
  onPress,
  accentSubtitle,
}: {
  item: HorizontalAppItem;
  onPress?: () => void;
  accentSubtitle?: boolean;
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
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

export function HorizontalAppsStrip({
  title,
  items,
  emptyMessage,
  countLabel,
  onPressItem,
  accentSubtitle = true,
}: HorizontalAppsStripProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showAll, setShowAll] = useState(false);
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
  const resolvedCountLabel =
    countLabel ?? (items.length > 0 ? `${items.length} apps` : undefined);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {resolvedCountLabel ? (
          <Text style={styles.countLabel}>{resolvedCountLabel}</Text>
        ) : null}
      </View>

      {items.length === 0 ? (
        emptyMessage ? <Text style={styles.hint}>{emptyMessage}</Text> : null
      ) : (
        <ScrollView
          contentContainerStyle={styles.horizontalContent}
          horizontal
          onContentSizeChange={() => {
            if (!showAll) {
              listRef.current?.scrollTo({ x: 0, y: 0, animated: false });
            }
          }}
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
            />
          ))}
          {hiddenCount > 0 || showAll ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAll(current => !current)}
              style={({ pressed }) => [
                styles.showAllCard,
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
      width: 108,
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
      alignItems: 'baseline',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
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
      gap: spacing.sm,
      paddingRight: spacing.sm,
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
      width: 108,
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
