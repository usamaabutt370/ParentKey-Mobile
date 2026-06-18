import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors } from '../theme';

type ScreenBackgroundProps = ViewProps & {
  children: React.ReactNode;
};

export function ScreenBackground({
  children,
  style,
  ...props
}: ScreenBackgroundProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      <View style={styles.glowPrimary} />
      <View style={styles.glowSecondary} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    flex: 1,
    overflow: 'hidden',
  },
  glowPrimary: {
    backgroundColor: colors.background.accentStrong,
    borderRadius: 200,
    height: 400,
    left: -120,
    position: 'absolute',
    top: -80,
    width: 400,
  },
  glowSecondary: {
    backgroundColor: colors.background.accent,
    borderRadius: 160,
    height: 320,
    position: 'absolute',
    right: -100,
    top: 120,
    width: 320,
  },
});
