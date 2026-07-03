import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { cacheIconBase64ToFile } from '../lib/iconCache';
import type { ColorPalette } from '../theme/colors';
import { typography } from '../theme';

function normalizeImageUri(uri: string): string {
  if (
    uri.startsWith('data:') ||
    uri.startsWith('file://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  ) {
    return uri;
  }

  return `file://${uri}`;
}

type AppIconProps = {
  name: string;
  packageName?: string;
  iconUri?: string | null;
  iconBase64?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function AppIcon({
  name,
  packageName,
  iconUri,
  iconBase64,
  size = 40,
  style,
}: AppIconProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, size), [colors, size]);
  const [resolvedUri, setResolvedUri] = useState<string | null>(iconUri ?? null);
  const [failed, setFailed] = useState(false);
  const cacheKey = packageName ?? name;
  const initial = name.charAt(0).toUpperCase() || '?';
  const showImage = Boolean(resolvedUri && !failed);

  useEffect(() => {
    let cancelled = false;

    setFailed(false);

    if (iconUri) {
      setResolvedUri(normalizeImageUri(iconUri));
      return;
    }

    if (!iconBase64) {
      setResolvedUri(null);
      return;
    }

    if (Platform.OS === 'ios') {
      setResolvedUri(`data:image/png;base64,${iconBase64}`);
      return;
    }

    void cacheIconBase64ToFile(cacheKey, iconBase64)
      .then(filePath => {
        if (!cancelled) {
          setResolvedUri(normalizeImageUri(filePath));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUri(`data:image/png;base64,${iconBase64}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, iconBase64, iconUri]);

  return (
    <View style={[styles.container, style]}>
      {showImage ? (
        <Image
          onError={() => setFailed(true)}
          resizeMode="cover"
          source={{ uri: resolvedUri! }}
          style={styles.image}
        />
      ) : (
        <Text style={styles.fallbackText}>{initial}</Text>
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette, size: number) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: size / 2,
      flexShrink: 0,
      height: size,
      justifyContent: 'center',
      overflow: 'hidden',
      width: size,
    },
    image: {
      ...StyleSheet.absoluteFillObject,
      height: size,
      width: size,
    },
    fallbackText: {
      ...typography.label,
      color: colors.text.brand,
      fontSize: Math.max(14, size * 0.4),
      lineHeight: Math.max(14, size * 0.4),
    },
  });
}
