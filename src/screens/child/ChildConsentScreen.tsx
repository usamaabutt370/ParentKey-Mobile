import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout } from '../../components';
import { InfoTipCard } from '../../components/parent';
import { ChildSetupStepLayout } from '../../components/child/ChildSetupStepLayout';
import { CHILD_SETUP_TOTAL_STEPS } from '../../constants/childSetup';
import { useTheme } from '../../context/ThemeContext';
import type { ChildStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ChildStackParamList, 'ChildConsent'>;

const CONSENT_POINTS = [
  'See which apps are installed on this device',
  'View how long apps are used each day',
  'Block or limit apps your parent chooses',
];

export function ChildConsentScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      scrollable
      contentStyle={styles.content}>
      <ChildSetupStepLayout
        currentStep={1}
        icon="🤝"
        subtitle="Your parent can manage screen time on this device. You need to agree before setup continues."
        title="Connect to your parent"
        totalSteps={CHILD_SETUP_TOTAL_STEPS}>
        <View style={styles.list}>
          {CONSENT_POINTS.map(point => (
            <View key={point} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{point}</Text>
            </View>
          ))}
        </View>

        <InfoTipCard message="ParentKey cannot be installed without your knowledge. You control the permissions on this phone." />

        <AuthButton
          onPress={() => navigation.navigate('ChildProfileSetup')}
          title="I agree, continue"
        />
      </ChildSetupStepLayout>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
    },
    list: {
      gap: spacing.sm,
    },
    listItem: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    bullet: {
      ...typography.body,
      color: colors.text.brand,
      fontWeight: '700',
    },
    listText: {
      ...typography.body,
      color: colors.text.primary,
      flex: 1,
    },
  });
}
