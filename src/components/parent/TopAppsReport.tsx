import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { MockTopApp } from '../../constants/mockReportData';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type TopAppsReportProps = {
  apps: MockTopApp[];
};

export function TopAppsReport({ apps }: TopAppsReportProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.appList}>
      {apps.map(app => (
        <View key={app.name} style={styles.appRow}>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{app.name}</Text>
            <Text style={styles.appTime}>{app.time}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${app.percentage}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    appList: {
      gap: spacing.md,
    },
    appRow: {
      gap: spacing.sm,
    },
    appInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    appName: {
      ...typography.label,
      color: colors.text.primary,
    },
    appTime: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    barTrack: {
      backgroundColor: colors.border.default,
      borderRadius: radii.pill,
      height: 6,
      overflow: 'hidden',
    },
    barFill: {
      backgroundColor: colors.brand.teal,
      borderRadius: radii.pill,
      height: '100%',
    },
  });
}
