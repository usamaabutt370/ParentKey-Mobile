import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { AuthButton, AuthTextInput, ScreenLayout } from '../../components';
import { ScreenHeader } from '../../components/parent';
import {
  APP_CATEGORY_FILTERS,
  APP_CATEGORY_LABELS,
} from '../../constants/appCategories';
import { useInstalledApps } from '../../hooks/useInstalledApps';
import {
  filterInstalledApps,
  getSocialApps,
} from '../../lib/installedApps';
import { useTheme } from '../../context/ThemeContext';
import type { ControlsStackParamList } from '../../navigation/types';
import type { AppCategoryFilter, InstalledApp } from '../../types/installedApp';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ControlsStackParamList, 'SelectApps'>;

export function SelectAppsScreen({ navigation, route }: Props) {
  const { mode } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { apps, loading, error, iosRequiresFamilyPicker, refresh } =
    useInstalledApps();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] =
    useState<AppCategoryFilter>('all');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  const socialApps = useMemo(() => getSocialApps(apps), [apps]);

  const filteredApps = useMemo(
    () => filterInstalledApps(apps, searchQuery, categoryFilter),
    [apps, searchQuery, categoryFilter],
  );

  const toggleApp = (appId: string) => {
    setSelectedAppIds(current =>
      current.includes(appId)
        ? current.filter(id => id !== appId)
        : [...current, appId],
    );
  };

  const selectSocialApps = () => {
    setSelectedAppIds(socialApps.map(app => app.id));
    setCategoryFilter('social');
  };

  const handleContinue = () => {
    navigation.goBack();
  };

  const renderApp = ({ item }: { item: InstalledApp }) => {
    const isSelected = selectedAppIds.includes(item.id);

    return (
      <Pressable
        onPress={() => toggleApp(item.id)}
        style={[styles.appRow, isSelected && styles.appRowSelected]}>
        <View style={styles.appIcon}>
          <Text style={styles.appIconText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.appInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.appName}>{item.name}</Text>
            {item.category === 'social' ? (
              <View style={styles.socialBadge}>
                <Text style={styles.socialBadgeText}>Social</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.packageName}>{item.packageName}</Text>
          <Text style={styles.appMeta}>
            {item.isSystemApp ? 'System app' : 'Third-party app'} ·{' '}
            {APP_CATEGORY_LABELS[item.category]}
          </Text>
        </View>
        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}>
          {isSelected ? (
            <Feather color={colors.button.text} name="check" size={14} />
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenLayout safeAreaEdges={['top', 'left', 'right']} style={styles.layout}>
      <View style={styles.headerSection}>
        <ScreenHeader
          onBack={() => navigation.goBack()}
          subtitle={
            mode === 'block'
              ? 'Scan this device and choose apps to block'
              : 'Scan this device and choose apps to limit'
          }
          title="Select apps"
        />
        {!iosRequiresFamilyPicker && !loading && !error ? (
          <Text style={styles.scanSummary}>
            Found {apps.length} launchable apps on this device, including system
            and third-party apps.
          </Text>
        ) : null}
        {!iosRequiresFamilyPicker ? (
          <>
            <AuthTextInput
              autoCapitalize="none"
              autoCorrect={false}
              label="Search apps"
              onChangeText={setSearchQuery}
              placeholder="Facebook, Instagram, TikTok..."
              value={searchQuery}
            />
            {socialApps.length > 0 ? (
              <AuthButton
                onPress={selectSocialApps}
                title={`Select social apps (${socialApps.length})`}
                variant="secondary"
              />
            ) : null}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}>
              {APP_CATEGORY_FILTERS.map(filter => {
                const isActive = categoryFilter === filter.id;

                return (
                  <Pressable
                    key={filter.id}
                    onPress={() => setCategoryFilter(filter.id)}
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive && styles.filterChipTextActive,
                      ]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.brand.tealLight} size="large" />
          <Text style={styles.stateText}>Scanning installed apps...</Text>
        </View>
      ) : iosRequiresFamilyPicker ? (
        <View style={styles.centerState}>
          <Feather color={colors.text.brand} name="smartphone" size={32} />
          <Text style={styles.stateTitle}>iOS uses Apple&apos;s app picker</Text>
          <Text style={styles.stateText}>
            Apple does not allow third-party apps to list every installed app.
            On the child&apos;s iPhone, we will use Screen Time&apos;s native app
            picker instead.
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Could not scan apps</Text>
          <Text style={styles.stateText}>{error}</Text>
          <AuthButton onPress={() => void refresh()} title="Try again" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredApps}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateText}>
                No apps match this filter. Try All apps or search by name.
              </Text>
            </View>
          }
          renderItem={renderApp}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      )}

      {!loading && !iosRequiresFamilyPicker && !error ? (
        <View style={styles.footer}>
          <Text style={styles.selectedCount}>
            {selectedAppIds.length} app{selectedAppIds.length === 1 ? '' : 's'}{' '}
            selected
          </Text>
          <AuthButton
            disabled={selectedAppIds.length === 0}
            onPress={handleContinue}
            title="Save selection"
          />
        </View>
      ) : null}
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    layout: {
      flex: 1,
      paddingHorizontal: 0,
    },
    headerSection: {
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    scanSummary: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    filterRow: {
      gap: spacing.sm,
      paddingBottom: spacing.xs,
    },
    filterChip: {
      borderColor: colors.border.default,
      borderRadius: radii.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    filterChipActive: {
      backgroundColor: colors.background.accent,
      borderColor: colors.brand.teal,
    },
    filterChipText: {
      ...typography.caption,
      color: colors.text.secondary,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: colors.text.brand,
    },
    list: {
      flex: 1,
    },
    listContent: {
      gap: spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    appRow: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    appRowSelected: {
      borderColor: colors.brand.teal,
    },
    appIcon: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: radii.pill,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    appIconText: {
      ...typography.label,
      color: colors.text.brand,
      fontSize: 18,
    },
    appInfo: {
      flex: 1,
      gap: spacing.xs,
    },
    nameRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    appName: {
      ...typography.label,
      color: colors.text.primary,
    },
    socialBadge: {
      backgroundColor: colors.background.accent,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    socialBadgeText: {
      ...typography.caption,
      color: colors.text.brand,
      fontSize: 11,
      fontWeight: '700',
    },
    packageName: {
      ...typography.caption,
      color: colors.text.placeholder,
    },
    appMeta: {
      ...typography.caption,
      color: colors.text.secondary,
      fontSize: 11,
    },
    checkbox: {
      alignItems: 'center',
      borderColor: colors.border.strong,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      height: 22,
      justifyContent: 'center',
      width: 22,
    },
    checkboxSelected: {
      backgroundColor: colors.brand.teal,
      borderColor: colors.brand.teal,
    },
    footer: {
      borderTopColor: colors.border.default,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: spacing.sm,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    selectedCount: {
      ...typography.caption,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    centerState: {
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    stateTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
      textAlign: 'center',
    },
    stateText: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
}
