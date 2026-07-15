import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButton, ScreenBackground } from '../../../components';
import { WelcomeSlideOverlay } from '../../../components/parent/WelcomeSlideOverlay';
import { PARENT_WELCOME_SLIDES } from '../../../constants/parentOnboarding';
import { useTheme } from '../../../context/ThemeContext';
import {
  markParentWelcomeVisited,
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
const AUTO_ADVANCE_MS = 4500;
const SLIDE_COUNT = PARENT_WELCOME_SLIDES.length;

export function ParentWelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const slide = PARENT_WELCOME_SLIDES[index];
  const isLast = index === SLIDE_COUNT - 1;

  const stopProgress = useCallback(() => {
    animationRef.current?.stop();
    animationRef.current = null;
  }, []);

  // Fill the active step bar, then advance (Stories-style).
  useEffect(() => {
    stopProgress();
    progress.setValue(0);

    if (index >= SLIDE_COUNT - 1) {
      // Last slide: fill fully and wait for Get started.
      animationRef.current = Animated.timing(progress, {
        toValue: 1,
        duration: AUTO_ADVANCE_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animationRef.current.start();
      return stopProgress;
    }

    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: AUTO_ADVANCE_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        setIndex(current =>
          current >= SLIDE_COUNT - 1 ? current : current + 1,
        );
      }
    });

    return stopProgress;
  }, [index, progress, stopProgress]);

  const goToDeviceRole = useCallback(() => {
    stopProgress();
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('DeviceRole');
  }, [navigation, stopProgress]);

  const handleSideNext = () => {
    setIndex(current =>
      current >= SLIDE_COUNT - 1 ? current : current + 1,
    );
  };

  const handleSidePrevious = () => {
    if (index <= 0) {
      goToDeviceRole();
      return;
    }
    setIndex(current => Math.max(0, current - 1));
  };

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        if (index <= 0) {
          goToDeviceRole();
          return true;
        }
        setIndex(current => Math.max(0, current - 1));
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onHardwareBack,
      );
      return () => subscription.remove();
    }, [goToDeviceRole, index]),
  );

  const handleContinue = () => {
    if (isLast) {
      stopProgress();
      Promise.all([
        markParentWelcomeVisited(),
        setPreAuthSetupRoute('AddChildIntro'),
      ])
        .then(() => {
          navigation.navigate('AddChildIntro');
        })
        .catch(() => undefined);
      return;
    }

    setIndex(current => current + 1);
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
        <View style={styles.progressRow}>
          {PARENT_WELCOME_SLIDES.map((_, segmentIndex) => {
            if (segmentIndex < index) {
              return (
                <View key={segmentIndex} style={styles.progressTrack}>
                  <View style={[styles.progressFill, styles.progressFillFull]} />
                </View>
              );
            }

            if (segmentIndex > index) {
              return <View key={segmentIndex} style={styles.progressTrack} />;
            }

            return (
              <View key={segmentIndex} style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

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

          <View style={styles.tapZones} pointerEvents="box-none">
            <Pressable
              accessibilityLabel="Previous slide"
              accessibilityRole="button"
              onPress={handleSidePrevious}
              style={styles.tapZoneLeft}
            />
            <Pressable
              accessibilityLabel="Next slide"
              accessibilityRole="button"
              onPress={handleSideNext}
              style={styles.tapZoneRight}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <AuthButton onPress={handleContinue} title={slide.buttonTitle} />
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
      marginTop: spacing.lg,
      zIndex: 2,
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
    progressFillFull: {
      width: '100%',
    },
    main: {
      flex: 1,
      gap: spacing.xl,
      justifyContent: 'center',
      position: 'relative',
    },
    visualWrap: {
      marginBottom: spacing.md,
      position: 'relative',
      zIndex: 0,
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
      zIndex: 0,
    },
    tapZones: {
      ...StyleSheet.absoluteFill,
      flexDirection: 'row',
      zIndex: 1,
    },
    tapZoneLeft: {
      flex: 1,
    },
    tapZoneRight: {
      flex: 1,
    },
    footer: {
      bottom: 10,
      paddingBottom: spacing.md,
      paddingTop: spacing.lg,
      zIndex: 2,
    },
  });
}
