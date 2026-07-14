import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import type { WelcomeOverlayKind } from '../../constants/parentOnboarding';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';

type Props = {
  kind: WelcomeOverlayKind;
};

export function WelcomeSlideOverlay({ kind }: Props) {
  const { colors } = useTheme();
  const accent = colors.brand.tealDark;
  const styles = useMemo(() => createStyles(accent), [accent]);

  if (kind === 'appBlock') {
    return (
      <View style={styles.pill}>
        <View style={[styles.appIcon, styles.appIconDark]}>
          <Text style={styles.appIconGlyph}>▶︎</Text>
        </View>
        <Text style={styles.pillLabel}>Social apps</Text>
        <View style={styles.lockCircle}>
          <Feather color={accent} name="lock" size={14} />
        </View>
      </View>
    );
  }

  if (kind === 'screenTime') {
    return (
      <View style={styles.screenTimeCard}>
        <View style={styles.screenTimeUsed}>
          <Feather color="#FFFFFF" name="clock" size={14} />
          <Text style={styles.screenTimeUsedText}>1h 28min</Text>
        </View>
        <View style={styles.screenTimeLimit}>
          <Text style={styles.screenTimeLimitText}>2h</Text>
          <Feather color={accent} name="lock" size={14} />
        </View>
      </View>
    );
  }

  if (kind === 'sleepSchedule') {
    return (
      <View style={styles.pill}>
        <View style={styles.lockSquare}>
          <Feather color="#FFFFFF" name="lock" size={14} />
        </View>
        <Text style={styles.pillLabel}>10:00PM – 08:00AM</Text>
        <Feather color="#94A3B8" name="moon" size={16} />
      </View>
    );
  }

  if (kind === 'location') {
    return (
      <View style={styles.mapCard}>
        <View style={styles.mapGrid}>
          <View style={[styles.mapBlock, styles.mapGreen]} />
          <View style={[styles.mapBlock, styles.mapBlue]} />
          <View style={[styles.mapBlock, styles.mapBlueSoft]} />
          <View style={[styles.mapBlock, styles.mapGreenSoft]} />
        </View>
        <View style={styles.mapPinWrap}>
          <View style={styles.avatar}>
            <Feather color={accent} name="user" size={18} />
          </View>
          <View style={styles.batteryBadge}>
            <Feather color="#16A34A" name="battery" size={10} />
          </View>
          <View style={styles.pin}>
            <Feather color="#FFFFFF" name="map-pin" size={12} />
          </View>
        </View>
      </View>
    );
  }

  if (kind === 'webControl') {
    return (
      <View style={styles.webCard}>
        <View style={styles.webTabs}>
          <View style={[styles.webTab, styles.webTabActive]}>
            <Feather color={accent} name="globe" size={14} />
            <Text style={styles.webTabActiveText}>Browser</Text>
          </View>
          <View style={styles.webTab}>
            <Feather color="#94A3B8" name="play-circle" size={14} />
            <Text style={styles.webTabText}>Video</Text>
          </View>
        </View>
        <View style={styles.webBody}>
          <View style={styles.ageBadge}>
            <Text style={styles.ageBadgeText}>18+</Text>
          </View>
          <View style={styles.webLines}>
            <View style={[styles.webLine, { width: '78%' }]} />
            <View style={[styles.webLine, { width: '62%' }]} />
            <View style={[styles.webLine, { width: '48%' }]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#FBBF24', '#F97316']}
      end={{ x: 1, y: 0.5 }}
      start={{ x: 0, y: 0.5 }}
      style={styles.rewardBadge}>
      <View style={styles.rewardIcon}>
        <Feather color="#F97316" name="clock" size={16} />
      </View>
      <Text style={styles.rewardText}>+30 min</Text>
    </LinearGradient>
  );
}

function createStyles(accent: string) {
  return StyleSheet.create({
    pill: {
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: radii.pill,
      elevation: 6,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
    },
    appIcon: {
      alignItems: 'center',
      borderRadius: 8,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    appIconDark: {
      backgroundColor: '#111827',
    },
    appIconGlyph: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    pillLabel: {
      color: '#111827',
      fontSize: 15,
      fontWeight: '700',
    },
    lockCircle: {
      alignItems: 'center',
      backgroundColor: 'rgba(13, 148, 136, 0.16)',
      borderRadius: 14,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    lockSquare: {
      alignItems: 'center',
      backgroundColor: accent,
      borderRadius: 8,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    screenTimeCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: radii.pill,
      elevation: 6,
      flexDirection: 'row',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
    },
    screenTimeUsed: {
      alignItems: 'center',
      backgroundColor: '#F59E0B',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    screenTimeUsedText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    screenTimeLimit: {
      alignItems: 'center',
      backgroundColor: 'rgba(13, 148, 136, 0.14)',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    screenTimeLimitText: {
      color: accent,
      fontSize: 14,
      fontWeight: '800',
    },
    mapCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      elevation: 6,
      height: 108,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      width: 220,
    },
    mapGrid: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      padding: 10,
    },
    mapBlock: {
      borderRadius: 10,
      height: 40,
      width: '46%',
    },
    mapGreen: {
      backgroundColor: '#BBF7D0',
    },
    mapGreenSoft: {
      backgroundColor: '#DCFCE7',
    },
    mapBlue: {
      backgroundColor: '#BFDBFE',
    },
    mapBlueSoft: {
      backgroundColor: '#DBEAFE',
    },
    mapPinWrap: {
      alignItems: 'center',
      left: '50%',
      marginLeft: -22,
      position: 'absolute',
      top: 22,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderColor: accent,
      borderRadius: 22,
      borderWidth: 2,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    batteryBadge: {
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      height: 16,
      justifyContent: 'center',
      position: 'absolute',
      right: -4,
      top: -2,
      width: 16,
    },
    pin: {
      alignItems: 'center',
      backgroundColor: accent,
      borderRadius: 10,
      height: 20,
      justifyContent: 'center',
      marginTop: 4,
      width: 20,
    },
    webCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      elevation: 6,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      width: 240,
    },
    webTabs: {
      backgroundColor: '#F3F4F6',
      flexDirection: 'row',
      gap: 6,
      padding: 6,
    },
    webTab: {
      alignItems: 'center',
      borderRadius: 10,
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'center',
      paddingVertical: 8,
    },
    webTabActive: {
      backgroundColor: '#FFFFFF',
    },
    webTabText: {
      color: '#94A3B8',
      fontSize: 12,
      fontWeight: '600',
    },
    webTabActiveText: {
      color: accent,
      fontSize: 12,
      fontWeight: '700',
    },
    webBody: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
    },
    ageBadge: {
      backgroundColor: '#FB7185',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    ageBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    webLines: {
      flex: 1,
      gap: 6,
    },
    webLine: {
      backgroundColor: 'rgba(13, 148, 136, 0.25)',
      borderRadius: 4,
      height: 8,
    },
    rewardBadge: {
      alignItems: 'center',
      borderRadius: radii.pill,
      elevation: 6,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
    },
    rewardIcon: {
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    rewardText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },
  });
}
