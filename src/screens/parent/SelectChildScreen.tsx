import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout } from '../../components';
import { ChildCard, ScreenHeader } from '../../components/parent';
import { useTheme } from '../../context/ThemeContext';
import { useParentChildren } from '../../hooks/useParentChildren';
import type { ControlsStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ControlsStackParamList, 'SelectChild'>;

export function SelectChildScreen({ navigation, route }: Props) {
  const { mode } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { children, loading, error } = useParentChildren();

  const title = mode === 'block' ? 'Block apps' : 'Set app limits';
  const subtitle =
    mode === 'block'
      ? 'Choose which child’s apps you want to block'
      : 'Choose which child’s apps you want to limit';

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        subtitle={subtitle}
        title={title}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand.tealLight} size="large" />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : children.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No linked children</Text>
          <Text style={styles.emptyBody}>
            Add a child account first, then have them sign in on their Android
            device to upload installed apps.
          </Text>
          <AuthButton
            onPress={() =>
              navigation.getParent()?.navigate('Children', {
                screen: 'AddChildProfile',
              })
            }
            title="Add child"
          />
        </View>
      ) : (
        <View style={styles.list}>
          {children.map(child => (
            <ChildCard
              child={child}
              key={child.id}
              onPress={() =>
                navigation.navigate('SelectApps', {
                  mode,
                  childId: child.id,
                })
              }
            />
          ))}
        </View>
      )}
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
    },
    list: {
      gap: spacing.sm,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
    },
    errorText: {
      ...typography.body,
      color: colors.error,
    },
    emptyCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    emptyTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    emptyBody: {
      ...typography.body,
      color: colors.text.secondary,
    },
  });
}
