import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { AuthButton, ScreenLayout } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { useParentChildren } from '../../hooks/useParentChildren';
import { getChildDisplayName } from '../../lib/children';
import type { ChildrenStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ChildrenStackParamList, 'PairChildSuccess'>;

export function PairChildSuccessScreen({ navigation, route }: Props) {
  const { childId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children, loading } = useParentChildren();
  const child = children.find(item => item.id === childId);
  const displayName = child ? getChildDisplayName(child) : 'Your child';

  const handleDone = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ChildrenList' }],
    });
  };

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.checkCircle}>
          <Feather color={colors.brand.tealLight} name="check" size={36} />
        </View>
        <Text style={styles.title}>{displayName} is linked!</Text>
        <Text style={styles.subtitle}>
          Their device is connected. They can finish permissions on their phone
          and start using ParentKey Child.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text style={[styles.summaryValue, styles.status]}>Device linked</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.brand.tealLight} size="small" />
        ) : child?.email ? (
          <>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Device account</Text>
              <Text style={styles.summaryValue}>{child.email}</Text>
            </View>
          </>
        ) : null}
      </View>

      <AuthButton onPress={handleDone} title="Back to children" />
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
      justifyContent: 'center',
    },
    hero: {
      alignItems: 'center',
      gap: spacing.md,
      paddingTop: spacing.xl,
    },
    checkCircle: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: radii.pill,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 26,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    summaryCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    summaryRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    summaryLabel: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    summaryValue: {
      ...typography.label,
      color: colors.text.primary,
      flexShrink: 1,
      textAlign: 'right',
    },
    status: {
      color: colors.success,
    },
    divider: {
      backgroundColor: colors.border.default,
      height: StyleSheet.hairlineWidth,
    },
  });
}
