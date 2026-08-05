import React, { useMemo } from 'react';
import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import {
  pickThemeableImage,
  type ThemeableImageSource,
} from '../../constants/childOnboarding';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = {
  children?: React.ReactNode;
  currentStep: number;
  icon?: string | null;
  image?: ImageSourcePropType | ThemeableImageSource;
  subtitle?: string;
  title?: string;
  totalSteps: number;
};

function isThemeableImageSource(
  value: ImageSourcePropType | ThemeableImageSource,
): value is ThemeableImageSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    'dark' in value &&
    'light' in value
  );
}

export function ChildSetupStepLayout({
  children,
  currentStep,
  icon,
  image,
  subtitle,
  title,
  totalSteps,
}: Props) {
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const heroSize = Math.round(windowWidth * 0.7);
  const imageSource = image
    ? isThemeableImageSource(image)
      ? pickThemeableImage(image, isDark)
      : image
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentStep - 1 && styles.progressDotActive,
              index < currentStep - 1 && styles.progressDotDone,
            ]}
          />
        ))}
      </View>

      <Text style={styles.eyebrow}>
        Step {currentStep} of {totalSteps}
      </Text>
      {imageSource ? (
        <View style={[styles.heroFrame, { width: heroSize, height: heroSize }]}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={imageSource}
            style={styles.heroImage}
          />
        </View>
      ) : icon ? (
        <Text style={styles.icon}>{icon}</Text>
      ) : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
      justifyContent: 'flex-start',
      paddingTop: spacing.sm,
    },
    progressRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
    },
    progressDot: {
      backgroundColor: colors.border.default,
      borderRadius: 4,
      height: 6,
      width: 24,
    },
    progressDotActive: {
      backgroundColor: colors.brand.teal,
    },
    progressDotDone: {
      backgroundColor: colors.text.brand,
    },
    eyebrow: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '700',
      letterSpacing: 0.5,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    icon: {
      fontSize: 48,
      textAlign: 'center',
    },
    heroFrame: {
      alignSelf: 'center',
      backgroundColor: colors.background.primary,
      borderColor: colors.border.default,
      borderRadius: radii.xl,
      borderWidth: 1,
      overflow: 'hidden',
    },
    heroImage: {
      borderRadius: radii.xl,
      height: '100%',
      width: '100%',
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 28,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    body: {
      gap: spacing.md,
      marginTop: spacing.sm,
    },
  });
}
