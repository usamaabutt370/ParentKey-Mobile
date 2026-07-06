import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { UsageDailyTotal } from '../../types/appUsage';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type WeeklyUsageChartProps = {
  data: UsageDailyTotal[];
};

export function WeeklyUsageChart({ data }: WeeklyUsageChartProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const maxHours = Math.max(...data.map(item => item.hours), 0);

  return (
    <View style={styles.chart}>
      {data.map(item => {
        const hasActivity = item.hours > 0;
        const barHeight =
          hasActivity && maxHours > 0 ? (item.hours / maxHours) * 100 : 0;

        return (
          <View key={item.day} style={styles.barColumn}>
            <Text style={styles.barValue}>{item.label}</Text>
            <View style={styles.barTrack}>
              {hasActivity ? (
                <View style={[styles.barFill, { height: `${barHeight}%` }]} />
              ) : null}
            </View>
            <Text style={styles.barLabel}>{item.day}</Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    chart: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: spacing.sm,
      height: 160,
      justifyContent: 'space-between',
    },
    barColumn: {
      alignItems: 'center',
      flex: 1,
      gap: spacing.xs,
      justifyContent: 'flex-end',
    },
    barValue: {
      ...typography.caption,
      color: colors.text.secondary,
      fontSize: 10,
    },
    barTrack: {
      backgroundColor: colors.border.default,
      borderRadius: radii.sm,
      height: 90,
      justifyContent: 'flex-end',
      overflow: 'hidden',
      width: '100%',
    },
    barFill: {
      backgroundColor: colors.brand.teal,
      borderRadius: radii.sm,
      width: '100%',
    },
    barLabel: {
      ...typography.caption,
      color: colors.text.primary,
      fontWeight: '600',
    },
  });
}
