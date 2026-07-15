import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButton, ScreenBackground } from '../../../components';
import { useTheme } from '../../../context/ThemeContext';
import type { AuthStackParamList } from '../../../navigation/types';
import {
  setDeviceRoleChoice,
  type DeviceRoleChoice,
} from '../../../lib/pendingParentAction';
import type { ColorPalette } from '../../../theme/colors';
import { radii, spacing, typography } from '../../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'DeviceRole'>;

const PARENT_COLOR = '#7B61C8';
const KID_COLOR = '#F08A3A';

const COLLAPSED_HEIGHT = 92;
const EXPANDED_HEIGHT = 300;

type RoleCardProps = {
  colors: ColorPalette;
  description: string;
  expanded: boolean;
  image: number;
  onPress: () => void;
  selectedColor: string;
  title: string;
};

function RoleCard({
  colors,
  description,
  expanded,
  image,
  onPress,
  selectedColor,
  title,
}: RoleCardProps) {
  const styles = useMemo(() => createCardStyles(colors), [colors]);
  const height = useRef(
    new Animated.Value(expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT),
  ).current;
  const imageOpacity = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(height, {
        toValue: expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(imageOpacity, {
        toValue: expanded ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded, height, imageOpacity]);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: expanded
              ? selectedColor
              : colors.input.background,
            borderColor: expanded ? selectedColor : colors.border.default,
            height,
          },
        ]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardCopy}>
            <Text
              style={[
                styles.cardTitle,
                expanded ? styles.cardTitleSelected : null,
              ]}>
              {title}
            </Text>
            <Text
              style={[
                styles.cardDescription,
                expanded ? styles.cardDescriptionSelected : null,
              ]}>
              {description}
            </Text>
          </View>
          <View
            style={[
              styles.radioOuter,
              expanded ? styles.radioOuterSelected : styles.radioOuterIdle,
            ]}>
            {expanded ? (
              <View
                style={[styles.radioInner, { backgroundColor: selectedColor }]}
              />
            ) : null}
          </View>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[styles.imageWrap, { opacity: imageOpacity }]}>
          <Image resizeMode="contain" source={image} style={styles.image} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export function DeviceRoleScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [role, setRole] = useState<DeviceRoleChoice>('parent');
  const [continuing, setContinuing] = useState(false);

  const handleContinue = async () => {
    if (continuing) {
      return;
    }
    setContinuing(true);
    try {
      await setDeviceRoleChoice(role);
      navigation.navigate('Welcome');
    } finally {
      setContinuing(false);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.title}>Who&apos;s going to use this device?</Text>

          <View style={styles.cards}>
            <RoleCard
              colors={colors}
              description="This is my phone"
              expanded={role === 'parent'}
              image={require('../../../../assets/onboarding/role-parent.png')}
              onPress={() => setRole('parent')}
              selectedColor={PARENT_COLOR}
              title="Parent"
            />
            <RoleCard
              colors={colors}
              description="This is my kid's phone"
              expanded={role === 'kid'}
              image={require('../../../../assets/onboarding/role-kid.png')}
              onPress={() => setRole('kid')}
              selectedColor={KID_COLOR}
              title="Kid"
            />
          </View>
        </View>

        <View style={styles.footer}>
          {/* <Pressable
            accessibilityRole="button"
            disabled={continuing}
            onPress={() => {
              handleContinue().catch(() => undefined);
            }}
            style={({ pressed }) => [
              styles.continueOuter,
              pressed && !continuing && styles.continuePressed,
              continuing && styles.continueDisabled,
            ]}>
            <LinearGradient
              colors={[colors.button.gradientStart, colors.button.gradientEnd]}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.continueButton}>
              <Text style={styles.continueLabel}>Continue</Text>
            </LinearGradient>
          </Pressable> */}
          <AuthButton onPress={handleContinue} title="Continue" />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createCardStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: 24,
      borderWidth: 1,
      overflow: 'hidden',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    cardHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
      zIndex: 2,
    },
    cardCopy: {
      flex: 1,
      gap: 4,
      paddingRight: spacing.md,
    },
    cardTitle: {
      color: colors.text.primary,
      fontSize: 22,
      fontWeight: '700',
    },
    cardTitleSelected: {
      color: '#FFFFFF',
    },
    cardDescription: {
      color: colors.text.placeholder,
      fontSize: 15,
      fontWeight: '500',
    },
    cardDescriptionSelected: {
      color: 'rgba(255, 255, 255, 0.9)',
    },
    radioOuter: {
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 2,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    radioOuterIdle: {
      borderColor: colors.border.strong,
    },
    radioOuterSelected: {
      backgroundColor: '#FFFFFF',
      borderColor: '#FFFFFF',
    },
    radioInner: {
      borderRadius: 7,
      height: 14,
      width: 14,
    },
    imageWrap: {
      alignItems: 'center',
      bottom: 4,
      left: spacing.md,
      position: 'absolute',
      right: spacing.md,
    },
    image: {
      height: 180,
      width: '100%',
    },
  });
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 28,
      lineHeight: 36,
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.sm,
      textAlign: 'center',
    },
    cards: {
      flex: 1,
      gap: spacing.md,
    },
    footer: {
      bottom: 50,
      left: spacing.lg,
      position: 'absolute',
      right: spacing.lg,
    },
    continueOuter: {
      borderRadius: radii.lg,
      elevation: 6,
      overflow: 'hidden',
      shadowColor: colors.button.glow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
    },
    continueButton: {
      alignItems: 'center',
      borderRadius: radii.lg,
      justifyContent: 'center',
      minHeight: 56,
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    continuePressed: {
      opacity: 0.9,
    },
    continueDisabled: {
      opacity: 0.6,
    },
    continueLabel: {
      color: colors.button.text,
      fontSize: 17,
      fontWeight: '700',
    },
  });
}
