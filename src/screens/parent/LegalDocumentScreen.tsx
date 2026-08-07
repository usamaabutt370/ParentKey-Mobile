import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { ScreenLayout } from '../../components';
import { getLegalDocument } from '../../constants/legalDocuments';
import { useTheme } from '../../context/ThemeContext';
import type { SettingsStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

/** Matches ParentTabNavigator tab bar content height (excluding safe-area inset). */
const TAB_BAR_CONTENT_HEIGHT = 56;

type Props = NativeStackScreenProps<SettingsStackParamList, 'LegalDocument'>;

export function LegalDocumentScreen({ navigation, route }: Props) {
  const { document: documentId } = route.params;
  const document = getLegalDocument(documentId);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.bottom),
    [colors, insets.bottom],
  );

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Feather color={colors.text.primary} name="chevron-left" size={24} />
        </Pressable>
        <Text style={styles.title}>{document.title}</Text>
        <Text style={styles.meta}>{document.meta}</Text>
      </View>

      <View style={styles.card}>
        {document.intro.map((paragraph, index) => (
          <Text key={`intro-${index}`} style={styles.body}>
            {paragraph}
          </Text>
        ))}

        {document.sections.map(section => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.heading}</Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text key={`${section.heading}-p-${index}`} style={styles.body}>
                {paragraph}
              </Text>
            ))}
            {section.bullets?.map(item => (
              <Text key={item} style={styles.bullet}>
                • {item}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.contact}>Contact: {document.contactEmail}</Text>
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette, bottomInset: number) {
  return StyleSheet.create({
    content: {
      gap: spacing.lg,
      paddingBottom: TAB_BAR_CONTENT_HEIGHT + bottomInset + spacing.xl,
    },
    header: {
      gap: spacing.sm,
    },
    backButton: {
      alignSelf: 'flex-start',
      marginLeft: -spacing.xs,
    },
    title: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 28,
    },
    meta: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    card: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    section: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    sectionTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    body: {
      ...typography.body,
      color: colors.text.secondary,
      lineHeight: 22,
    },
    bullet: {
      ...typography.body,
      color: colors.text.secondary,
      lineHeight: 22,
      paddingLeft: spacing.xs,
    },
    contact: {
      ...typography.caption,
      color: colors.text.brand,
      marginTop: spacing.md,
    },
  });
}
