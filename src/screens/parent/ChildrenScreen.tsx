import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthButton, ScreenLayout, useScreenStyles } from '../../components';
import { ChildCard, SectionHeader } from '../../components/parent';
import { MOCK_CHILDREN } from '../../constants/mockParentData';
import type { ChildrenStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type Props = NativeStackScreenProps<ChildrenStackParamList, 'ChildrenList'>;

export function ParentChildrenScreen({ navigation }: Props) {
  const screenStyles = useScreenStyles();
  const styles = useMemo(() => createStyles(), []);

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Children</Text>
        <Text style={screenStyles.subtitle}>
          Manage profiles, devices, and linked accounts
        </Text>
      </View>

      <AuthButton
        onPress={() => navigation.navigate('AddChildProfile')}
        title="Add child"
      />

      <View style={styles.section}>
        <SectionHeader title="Linked children" />
        <View style={styles.childList}>
          {MOCK_CHILDREN.map(child => (
            <ChildCard child={child} key={child.id} />
          ))}
        </View>
      </View>
    </ScreenLayout>
  );
}

function createStyles() {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
    },
    section: {
      gap: spacing.md,
    },
    childList: {
      gap: spacing.sm,
    },
  });
}
