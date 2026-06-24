import React, { useMemo } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ColorPalette } from '../theme/colors';

type ScreenBackgroundProps = ViewProps & {
  children: React.ReactNode;
};

export function ScreenBackground({
  children,
  style,
  ...props
}: ScreenBackgroundProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, style]} {...props}>
      <View style={styles.glowPrimary} />
      <View style={styles.glowSecondary} />
      <View style={styles.glowTertiary} />
      {children}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.primary,
      flex: 1,
      overflow: 'hidden',
    },
    glowPrimary: {
      backgroundColor: colors.background.accentStrong,
      borderRadius: 220,
      height: 460,
      left: -140,
      position: 'absolute',
      top: -100,
      width: 460,
    },
    glowSecondary: {
      backgroundColor: colors.background.accent,
      borderRadius: 180,
      height: 360,
      position: 'absolute',
      right: -120,
      top: 100,
      width: 360,
    },
    glowTertiary: {
      backgroundColor: colors.background.secondary,
      borderRadius: 200,
      bottom: -160,
      height: 380,
      left: '20%',
      position: 'absolute',
      width: 380,
    },
  });
}
