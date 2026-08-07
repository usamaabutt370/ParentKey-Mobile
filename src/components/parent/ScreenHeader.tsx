import React, { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type ScreenHeaderProps = {
  onBack?: () => void;
  title?: string;
  rightAction?: ReactNode;
  /** Shown below the header bar, not inside it. */
  stepLabel?: string;
  /** Shown below the header bar, not inside it. */
  subtitle?: string;
};

export function ScreenHeader({
  onBack,
  title,
  rightAction,
  stepLabel,
  subtitle,
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={styles.side}>
          {onBack ? (
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onBack}
              style={styles.iconButton}>
              <Feather
                color={colors.text.primary}
                name="chevron-left"
                size={24}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.titleWrap}>
          {title ? (
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
          ) : null}
        </View>

        <View style={[styles.side, styles.sideRight]}>
          {rightAction ?? null}
        </View>
      </View>

      {stepLabel || subtitle ? (
        <View style={styles.meta}>
          {stepLabel ? <Text style={styles.stepLabel}>{stepLabel}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    bar: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 40,
    },
    side: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      minWidth: 40,
    },
    sideRight: {
      alignItems: 'flex-end',
    },
    iconButton: {
      alignItems: 'center',
      height: 40,
      justifyContent: 'center',
      marginLeft: -spacing.xs,
      width: 40,
    },
    titleWrap: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    title: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    meta: {
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    stepLabel: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '600',
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
    },
  });
}
