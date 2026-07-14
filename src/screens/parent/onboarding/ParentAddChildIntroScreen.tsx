import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout } from '../../../components';
import { InfoTipCard } from '../../../components/parent';
import { PARENT_ONBOARDING_TOTAL_STEPS } from '../../../constants/parentOnboarding';
import { useTheme } from '../../../context/ThemeContext';
import { setPreAuthSetupRoute } from '../../../lib/pendingParentAction';
import type {
  AuthStackParamList,
  ParentOnboardingParamList,
} from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { spacing, typography } from '../../../theme';
import { ParentOnboardingStepLayout } from './ParentOnboardingStepLayout';

type Props =
  | NativeStackScreenProps<AuthStackParamList, 'AddChildIntro'>
  | NativeStackScreenProps<ParentOnboardingParamList, 'AddChildIntro'>;

type StackNavigation = {
  getState: () => { routeNames: readonly string[] };
  navigate: (screen: string) => void;
};

export function ParentAddChildIntroScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const stackNavigation = navigation as unknown as StackNavigation;
  const routeNames = stackNavigation.getState().routeNames;
  const canOpenQrAuth = routeNames.includes('LinkChildQrAuth');
  const canShowQr = routeNames.includes('ShowPairingQr');

  useEffect(() => {
    if (!canOpenQrAuth) {
      return;
    }

    setPreAuthSetupRoute('AddChildIntro').catch(() => undefined);
  }, [canOpenQrAuth]);

  const handleSkip = () => {
    if (canOpenQrAuth) {
      setPreAuthSetupRoute('LinkChildQrAuth')
        .then(() => {
          stackNavigation.navigate('LinkChildQrAuth');
        })
        .catch(() => undefined);
      return;
    }

    if (canShowQr) {
      stackNavigation.navigate('ShowPairingQr');
    }
  };

  const handleContinue = () => {
    if (canOpenQrAuth) {
      setPreAuthSetupRoute('InstallChildApp')
        .then(() => {
          stackNavigation.navigate('InstallChildApp');
        })
        .catch(() => undefined);
      return;
    }

    stackNavigation.navigate('InstallChildApp');
  };

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      contentStyle={styles.content}>
      <View style={styles.root}>
        <View style={styles.setupContent}>
          <ParentOnboardingStepLayout
            currentStep={1}
            icon="📱"
            subtitle="ParentKey works with two apps: this parent app, and ParentKey Child on your child’s phone."
            title="Add your child’s phone"
            totalSteps={PARENT_ONBOARDING_TOTAL_STEPS}>
            <View style={styles.list}>
              <Text style={styles.listItem}>
                1. Install ParentKey Child on their device
              </Text>
              <Text style={styles.listItem}>
                2. Scan the QR code from this phone
              </Text>
              <Text style={styles.listItem}>
                3. Your child accepts and grants permissions
              </Text>
            </View>

            <InfoTipCard message="ParentKey Child cannot be installed in secret. Setup only works with your child’s knowledge and consent." />
          </ParentOnboardingStepLayout>
        </View>

        <View style={styles.footer}>
          <AuthButton onPress={handleContinue} title="Continue" />
          <AuthButton
            onPress={handleSkip}
            title="Skip for now"
            variant="secondary"
          />
        </View>
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      flex: 1,
    },
    root: {
      flex: 1,
    },
    setupContent: {
      flex: 1,
      paddingBottom: 180,
    },
    footer: {
      bottom: 50,
      gap: spacing.md,
      left: 0,
      position: 'absolute',
      right: 0,
    },
    list: {
      gap: spacing.sm,
    },
    listItem: {
      ...typography.body,
      color: colors.text.primary,
    },
  });
}
