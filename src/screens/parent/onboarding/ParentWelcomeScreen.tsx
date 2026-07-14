import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButton, ScreenBackground } from '../../../components';
import { WelcomeSlideOverlay } from '../../../components/parent/WelcomeSlideOverlay';
import { PARENT_WELCOME_SLIDES } from '../../../constants/parentOnboarding';
import { useTheme } from '../../../context/ThemeContext';
import {
  clearPendingLinkChild,
  clearPreAuthSetupRoute,
  setPreAuthSetupRoute,
} from '../../../lib/pendingParentAction';
import type { AuthStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { spacing } from '../../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = spacing.lg;
const GAP = spacing.sm;
const COMPARE_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GAP) / 2;
const COMPARE_HEIGHT = COMPARE_WIDTH * 1.35;
const GRID_SIZE = COMPARE_WIDTH;

export function ParentWelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [index, setIndex] = useState(0);
  const slide = PARENT_WELCOME_SLIDES[index];
  const isLast = index === PARENT_WELCOME_SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      void setPreAuthSetupRoute('AddChildIntro').then(() => {
        navigation.navigate('AddChildIntro');
      });
      return;
    }

    setIndex(current => current + 1);
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
        <View style={styles.progressRow}>
          {PARENT_WELCOME_SLIDES.map((_, segmentIndex) => {
            const fillRatio =
              segmentIndex < index ? 1 : segmentIndex === index ? 0.85 : 0;

            return (
              <View key={segmentIndex} style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(fillRatio * 100)}%` },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Promise.all([
              clearPendingLinkChild(),
              clearPreAuthSetupRoute(),
            ]).then(() => {
              navigation.navigate('Login');
            });
          }}
          style={styles.signInHit}>
          <Text style={styles.signIn}>Sign in</Text>
        </Pressable>

        <View style={styles.main}>
          <View style={styles.visualWrap}>
            {slide.layout === 'compare' ? (
              <View style={styles.compareRow}>
                <Image
                  resizeMode="cover"
                  source={slide.before}
                  style={[
                    styles.compareImage,
                    slide.desaturateBefore ? styles.desaturated : null,
                  ]}
                />
                <Image
                  resizeMode="cover"
                  source={slide.after}
                  style={styles.compareImage}
                />
              </View>
            ) : (
              <View style={styles.grid}>
                {slide.images.map((source, imageIndex) => (
                  <Image
                    key={imageIndex}
                    resizeMode="cover"
                    source={source}
                    style={styles.gridImage}
                  />
                ))}
              </View>
            )}

            <View style={styles.overlayAnchor} pointerEvents="none">
              <WelcomeSlideOverlay kind={slide.overlay} />
            </View>
          </View>

          <Text style={styles.title}>{slide.title}</Text>
        </View>

        <View style={styles.footer}>
          <AuthButton onPress={handleNext} title={slide.buttonTitle} />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      paddingHorizontal: HORIZONTAL_PADDING,
      paddingTop: spacing.sm,
    },
    progressRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: spacing.sm,
    },
    progressTrack: {
      backgroundColor: colors.border.default,
      borderRadius: 999,
      flex: 1,
      height: 6,
      overflow: 'hidden',
    },
    progressFill: {
      backgroundColor: colors.brand.tealLight,
      borderRadius: 999,
      height: '100%',
    },
    signInHit: {
      alignSelf: 'flex-end',
      marginBottom: spacing.md,
      paddingVertical: spacing.xs,
    },
    signIn: {
      color: colors.text.brand,
      fontSize: 15,
      fontWeight: '600',
    },
    main: {
      flex: 1,
      gap: spacing.xl,
      justifyContent: 'center',
    },
    visualWrap: {
      marginBottom: spacing.md,
      position: 'relative',
    },
    compareRow: {
      flexDirection: 'row',
      gap: GAP,
      justifyContent: 'space-between',
    },
    compareImage: {
      borderRadius: 18,
      height: COMPARE_HEIGHT,
      width: COMPARE_WIDTH,
    },
    desaturated: {
      opacity: 0.92,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GAP,
      justifyContent: 'space-between',
    },
    gridImage: {
      borderRadius: 18,
      height: GRID_SIZE,
      width: GRID_SIZE,
    },
    overlayAnchor: {
      alignItems: 'center',
      bottom: -22,
      left: 0,
      position: 'absolute',
      right: 0,
    },
    title: {
      color: colors.text.primary,
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 36,
      paddingHorizontal: spacing.xs,
      paddingTop: spacing.md,
      textAlign: 'center',
    },
    footer: {
      paddingBottom: spacing.md,
      paddingTop: spacing.lg,
    },
  });
}
