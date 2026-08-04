import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout } from '../../../components';
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
  | NativeStackScreenProps<AuthStackParamList, 'InstallChildApp'>
  | NativeStackScreenProps<ParentOnboardingParamList, 'InstallChildApp'>;

type StackNavigation = {
  getState: () => { routeNames: readonly string[] };
  navigate: (screen: string) => void;
};

const INSTALL_STEPS = [
  'Open the Play Store on your child’s phone',
  'Search for ParentKey Child and install it',
  'Open ParentKey Child and allow camera access',
  'Come back here and tap Link a child',
] as const;

export function ParentInstallChildAppScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const stackNavigation = navigation as unknown as StackNavigation;
  const routeNames = stackNavigation.getState().routeNames;
  const canShowQr = routeNames.includes('ShowPairingQr');
  const canOpenQrAuth = routeNames.includes('LinkChildQrAuth');

  useEffect(() => {
    if (!canOpenQrAuth) {
      return;
    }

    setPreAuthSetupRoute('InstallChildApp').catch(() => undefined);
  }, [canOpenQrAuth]);

  const handleBack = () => {
    stackNavigation.navigate('AddChildIntro');
  };

  const handleLinkChild = () => {
    if (canShowQr) {
      stackNavigation.navigate('ShowPairingQr');
      return;
    }

    setPreAuthSetupRoute('LinkChildQrAuth')
      .then(() => {
        stackNavigation.navigate('LinkChildQrAuth');
      })
      .catch(() => undefined);
  };

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      scrollable
      contentStyle={styles.content}>
      <ParentOnboardingStepLayout
        currentStep={2}
        image={require('../../../../assets/onboarding/install-child-app.png')}
        onBack={handleBack}
        subtitle="Install the child app before linking. Next you’ll generate a QR code to connect their phone."
        title="Install ParentKey Child"
        totalSteps={PARENT_ONBOARDING_TOTAL_STEPS}>
        <View style={styles.list}>
          {INSTALL_STEPS.map((step, index) => (
            <View key={step} style={styles.row}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.listItem}>{step}</Text>
            </View>
          ))}
        </View>
      </ParentOnboardingStepLayout>

      <View style={styles.footer}>
        <AuthButton onPress={handleLinkChild} title="Link a child" />
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
    },
    list: {
      gap: spacing.md,
    },
    row: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
    },
    badge: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: 999,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    badgeText: {
      ...typography.label,
      color: colors.text.brand,
    },
    listItem: {
      ...typography.body,
      color: colors.text.primary,
      flex: 1,
      paddingTop: 2,
    },
    footer: {
      marginTop: 'auto',
      paddingTop: spacing.lg,
    },
  });
}
