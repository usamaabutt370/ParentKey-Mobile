import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import * as ReactNativeDeviceActivity from 'react-native-device-activity';
import { AuthButton } from '../AuthButton';
import { InfoTipCard } from '../parent/InfoTipCard';
import { IOS_DEFAULT_DAILY_LIMIT_MINUTES } from '../../constants/iosScreenTime';
import {
  applyBlockRules,
  clearRules,
  formatScreenTimeAuthError,
  getAuthorizationStatus,
  getSelectionId,
  getStoredSelectionSummary,
  hasStoredSelection,
  isIOSScreenTimeSupported,
  type IOSScreenTimeMode,
  type IOSSelectionSummary,
} from '../../lib/iosScreenTime';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = {
  mode: IOSScreenTimeMode;
  authApproved?: boolean;
  onComplete?: () => void;
  showChildDeviceNote?: boolean;
  stepOffset?: number;
};

export function IOSScreenTimePanel({
  mode,
  authApproved,
  onComplete,
  showChildDeviceNote = false,
  stepOffset = 0,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selectionId = getSelectionId(mode);

  const resolvedAuthApproved =
    authApproved ?? getAuthorizationStatus() === 'approved';
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectionSummary, setSelectionSummary] =
    useState<IOSSelectionSummary | null>(() => getStoredSelectionSummary(mode));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const step = (index: number) => index + stepOffset;

  const refreshSelectionSummary = useCallback(() => {
    setSelectionSummary(getStoredSelectionSummary(mode));
  }, [mode]);

  const handleOpenPicker = () => {
    setError(null);
    setSuccessMessage(null);
    setPickerVisible(true);
  };

  const handleApplyRules = async () => {
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      if (!hasStoredSelection(mode)) {
        throw new Error('Choose at least one app or category first.');
      }

      applyBlockRules(mode);
      setSuccessMessage(
        mode === 'block'
          ? 'Selected apps are now blocked on this iPhone.'
          : `Selected apps are limited to ${IOS_DEFAULT_DAILY_LIMIT_MINUTES} minutes per day on this iPhone.`,
      );
      onComplete?.();
    } catch (applyError) {
      const message =
        applyError instanceof Error
          ? applyError.message
          : 'Could not apply Screen Time rules.';
      setError(formatScreenTimeAuthError(message));
    } finally {
      setSaving(false);
    }
  };

  const handleClearRules = () => {
    setError(null);
    setSuccessMessage(null);
    clearRules(mode);
    setSuccessMessage(
      mode === 'block'
        ? 'App blocks removed on this iPhone.'
        : 'Daily limits removed on this iPhone.',
    );
  };

  if (Platform.OS !== 'ios') {
    return null;
  }

  if (!isIOSScreenTimeSupported()) {
    return (
      <View style={styles.centerState}>
        <Feather color={colors.text.brand} name="smartphone" size={32} />
        <Text style={styles.stateTitle}>Use a physical iPhone</Text>
        <Text style={styles.stateText}>
          Apple&apos;s Screen Time picker and blocking APIs do not work in the
          iOS Simulator. Install ParentKey on a child&apos;s iPhone to choose
          apps and apply limits.
        </Text>
      </View>
    );
  }

  const totalSelected =
    (selectionSummary?.applicationCount ?? 0) +
    (selectionSummary?.categoryCount ?? 0) +
    (selectionSummary?.webDomainCount ?? 0);

  return (
    <View style={styles.container}>
      {showChildDeviceNote ? (
        <InfoTipCard message="On iOS, app blocking must be set up on the child's iPhone. Sign in with the child account there, grant Screen Time access, then choose apps below." />
      ) : null}

      <View style={styles.stepCard}>
        <Text style={styles.stepTitle}>
          {step(1)}. Choose apps with Apple&apos;s picker
        </Text>
        <Text style={styles.stepText}>
          {mode === 'block'
            ? 'Open the native Screen Time picker and select apps or categories to block.'
            : `Open the native Screen Time picker and select apps to limit to ${IOS_DEFAULT_DAILY_LIMIT_MINUTES} minutes per day.`}
        </Text>
        {totalSelected > 0 ? (
          <Text style={styles.selectionSummary}>
            Selected: {selectionSummary?.applicationCount ?? 0} apps,{' '}
            {selectionSummary?.categoryCount ?? 0} categories,{' '}
            {selectionSummary?.webDomainCount ?? 0} websites
          </Text>
        ) : (
          <Text style={styles.selectionSummary}>No apps selected yet</Text>
        )}
        <AuthButton
          disabled={!resolvedAuthApproved}
          onPress={handleOpenPicker}
          title="Choose apps"
          variant="secondary"
        />
      </View>

      <View style={styles.stepCard}>
        <Text style={styles.stepTitle}>
          {step(2)}. {mode === 'block' ? 'Apply block' : 'Apply daily limit'}
        </Text>
        <AuthButton
          disabled={!resolvedAuthApproved || totalSelected === 0 || saving}
          loading={saving}
          onPress={() => void handleApplyRules()}
          title={mode === 'block' ? 'Block selected apps' : 'Save daily limit'}
        />
        <AuthButton
          disabled={!hasStoredSelection(mode)}
          onPress={handleClearRules}
          title={mode === 'block' ? 'Remove blocks' : 'Remove limits'}
          variant="secondary"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {successMessage ? (
        <Text style={styles.successText}>{successMessage}</Text>
      ) : null}

      {pickerVisible ? (
        <ReactNativeDeviceActivity.DeviceActivitySelectionSheetViewPersisted
          familyActivitySelectionId={selectionId}
          headerText={
            mode === 'block' ? 'Choose apps to block' : 'Choose apps to limit'
          }
          onDismissRequest={() => {
            setPickerVisible(false);
            refreshSelectionSummary();
          }}
          onSelectionChange={() => {
            refreshSelectionSummary();
          }}
          style={styles.pickerAnchor}
        />
      ) : null}

    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
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
    stepCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.md,
    },
    stepTitle: {
      ...typography.label,
      color: colors.text.primary,
    },
    stepText: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    statusText: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    statusValue: {
      color: colors.text.brand,
      fontWeight: '700',
    },
    selectionSummary: {
      ...typography.caption,
      color: colors.text.brand,
      fontWeight: '600',
    },
    errorText: {
      ...typography.caption,
      color: colors.error,
      textAlign: 'center',
    },
    successText: {
      ...typography.caption,
      color: colors.success,
      textAlign: 'center',
    },
    pickerAnchor: {
      height: 1,
      position: 'absolute',
      width: 1,
    },
  });
}
