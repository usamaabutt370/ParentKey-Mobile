import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { AuthButton, AppIcon, ScreenLayout } from '../../components';
import { IOSScreenTimeAuthSection } from '../../components/ios/IOSScreenTimeAuthSection';
import { IOSScreenTimePanel } from '../../components/ios/IOSScreenTimePanel';
import { ScreenHeader } from '../../components/parent';
import { APP_CATEGORY_LABELS } from '../../constants/appCategories';
import { useAuth } from '../../context/AuthContext';
import { useInstalledApps } from '../../hooks/useInstalledApps';
import {
  fetchChildBlockRules,
  fetchChildInstalledApps,
  saveChildBlockRules,
} from '../../lib/appRules';
import { mergeInstalledAppIcons } from '../../lib/installedApps';
import type { IOSScreenTimeAuthorizationStatus } from '../../lib/iosScreenTime';
import { useTheme } from '../../context/ThemeContext';
import type { ControlsStackParamList } from '../../navigation/types';
import type { AppCategory, InstalledApp } from '../../types/installedApp';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ControlsStackParamList, 'SelectApps'>;

function mapChildAppRecord(app: {
  packageName: string;
  appName: string;
  isSystemApp: boolean;
  category: AppCategory | null;
  iconBase64?: string | null;
}): InstalledApp {
  return {
    id: app.packageName,
    name: app.appName,
    packageName: app.packageName,
    isSystemApp: app.isSystemApp,
    category: app.category ?? 'other',
    iconUri: null,
    iconBase64: app.iconBase64 ?? null,
  };
}

export function SelectAppsScreen({ navigation, route }: Props) {
  const { mode, childId } = route.params;
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const localAppsState = useInstalledApps();
  const [childApps, setChildApps] = useState<InstalledApp[]>([]);
  const [childAppsLoading, setChildAppsLoading] = useState(true);
  const [childAppsError, setChildAppsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [authStatus, setAuthStatus] =
    useState<IOSScreenTimeAuthorizationStatus>('notDetermined');
  const authApproved = authStatus === 'approved';

  const useChildInventory = Platform.OS !== 'ios';
  const apps = useChildInventory ? childApps : localAppsState.apps;
  const loading = useChildInventory ? childAppsLoading : localAppsState.loading;
  const error = useChildInventory ? childAppsError : localAppsState.error;
  const iosRequiresFamilyPicker = !useChildInventory && localAppsState.iosRequiresFamilyPicker;

  const loadChildApps = useCallback(async () => {
    setChildAppsLoading(true);
    setChildAppsError(null);

    const [appsResult, rulesResult] = await Promise.all([
      fetchChildInstalledApps(childId),
      fetchChildBlockRules(childId),
    ]);

    if (!appsResult.ok) {
      setChildApps([]);
      setChildAppsError(appsResult.message);
      setChildAppsLoading(false);
      return;
    }

    const mappedApps = appsResult.apps.map(mapChildAppRecord);
    const enrichedApps = await mergeInstalledAppIcons(mappedApps);
    setChildApps(enrichedApps);

    if (rulesResult.ok) {
      setSelectedAppIds(rulesResult.rules.map(rule => rule.packageName));
    }

    if (enrichedApps.length === 0) {
      setChildAppsError(
        'No apps uploaded yet. Ask your child to sign in on their Android device and tap Sync apps and rules.',
      );
    }

    setChildAppsLoading(false);
  }, [childId]);

  useEffect(() => {
    if (useChildInventory) {
      void loadChildApps();
    }
  }, [loadChildApps, useChildInventory]);

  const toggleApp = (appId: string) => {
    setSelectedAppIds(current =>
      current.includes(appId)
        ? current.filter(id => id !== appId)
        : [...current, appId],
    );
  };

  const handleContinue = async () => {
    if (mode === 'limit' && Platform.OS === 'android') {
      Alert.alert(
        'Coming soon',
        'Daily app limits on Android are not available yet. Use Block apps for now.',
      );
      return;
    }

    if (mode !== 'block' || !useChildInventory) {
      navigation.goBack();
      return;
    }

    const parentId = session?.user.id;
    if (!parentId) {
      Alert.alert('Sign in required', 'Please sign in again as a parent.');
      return;
    }

    setSaving(true);

    const selectedApps = apps
      .filter(app => selectedAppIds.includes(app.id))
      .map(app => ({
        packageName: app.packageName,
        appName: app.name,
      }));

    const result = await saveChildBlockRules({
      parentId,
      childId,
      apps: selectedApps,
    });

    setSaving(false);

    if (!result.ok) {
      Alert.alert('Could not save', result.message);
      return;
    }

    const clearedAll = selectedApps.length === 0;

    Alert.alert(
      clearedAll ? 'Blocks cleared' : 'Blocks saved',
      clearedAll
        ? 'All app blocks were removed. Changes will apply on the child device within a few seconds.'
        : 'Blocked apps were saved. They will apply on the child device within a few seconds.',
      [{ text: 'OK', onPress: () => navigation.popToTop() }],
    );
  };

  const renderApp = ({ item }: { item: InstalledApp }) => {
    const isSelected = selectedAppIds.includes(item.id);

    return (
      <Pressable
        onPress={() => toggleApp(item.id)}
        style={[styles.appRow, isSelected && styles.appRowSelected]}>
        <AppIcon
          iconBase64={item.iconBase64}
          iconUri={item.iconUri}
          name={item.name}
          packageName={item.packageName}
          size={44}
        />
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
              ? "Choose apps to block on your child's Android device"
              : "Choose apps to limit on your child's device"
          }
          title="Select apps"
        />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.brand.tealLight} size="large" />
          <Text style={styles.stateText}>
            {useChildInventory
              ? 'Loading apps from child device...'
              : 'Scanning installed apps...'}
          </Text>
        </View>
      ) : iosRequiresFamilyPicker ? (
        <ScrollView
          contentContainerStyle={styles.iosPanelContent}
          showsVerticalScrollIndicator={false}
          style={styles.iosPanel}>
          <IOSScreenTimeAuthSection onStatusChange={setAuthStatus} />
          <IOSScreenTimePanel
            authApproved={authApproved}
            mode={mode}
            showChildDeviceNote
            stepOffset={1}
          />
        </ScrollView>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Could not load apps</Text>
          <Text style={styles.stateText}>{error}</Text>
          {useChildInventory ? (
            <AuthButton onPress={() => void loadChildApps()} title="Try again" />
          ) : (
            <AuthButton
              onPress={() => void localAppsState.refresh()}
              title="Try again"
            />
          )}
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={apps}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateText}>No apps found on this device.</Text>
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
            loading={saving}
            onPress={() => void handleContinue()}
            title={
              selectedAppIds.length === 0
                ? 'Clear all blocks'
                : mode === 'block'
                  ? 'Save blocked apps'
                  : 'Save selection'
            }
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
    iosPanel: {
      flex: 1,
    },
    iosPanelContent: {
      gap: spacing.md,
      paddingBottom: spacing.lg,
    },
    headerSection: {
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    list: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      gap: spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.lg,
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
