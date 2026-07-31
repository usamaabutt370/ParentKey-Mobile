import React, { useMemo } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { getChildAvatar } from '../../constants/childAvatars';
import { useTheme } from '../../context/ThemeContext';
import { getChildDisplayName } from '../../lib/children';
import type { ChildProfile } from '../../types/child';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = {
  visible: boolean;
  childrenList: ChildProfile[];
  selectedChildId: string | null;
  onClose: () => void;
  onSelect: (childId: string) => void;
  onAddChild: () => void;
};

export function ChildPickerSheet({
  visible,
  childrenList,
  selectedChildId,
  onClose,
  onSelect,
  onAddChild,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop}>
        <Pressable
          onPress={event => event.stopPropagation()}
          style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.heading}>Your children</Text>
          <Text style={styles.subtitle}>
            Choose whose activity to show on Home
          </Text>

          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            style={styles.listScroll}>
            {childrenList.map(child => {
              const selected = child.id === selectedChildId;
              const displayName = getChildDisplayName(child);
              const avatar = getChildAvatar(child.avatarId ?? undefined);
              const photoUrl = child.avatarUrl?.trim() || null;

              return (
                <Pressable
                  key={child.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(child.id);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    selected && styles.rowSelected,
                    pressed && styles.rowPressed,
                  ]}>
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor:
                          avatar?.background ?? colors.background.accentStrong,
                      },
                    ]}>
                    {photoUrl ? (
                      <Image
                        resizeMode="cover"
                        source={{ uri: photoUrl }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {avatar?.emoji ?? displayName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.rowCopy}>
                    <Text numberOfLines={1} style={styles.rowTitle}>
                      {displayName}
                    </Text>
                    {child.age != null ? (
                      <Text style={styles.rowMeta}>{child.age} years old</Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <Feather
                      color={colors.text.brand}
                      name="check"
                      size={20}
                    />
                  ) : (
                    <Feather
                      color={colors.text.placeholder}
                      name="chevron-right"
                      size={18}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onAddChild();
            }}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}>
            <Feather color={colors.button.text} name="plus" size={18} />
            <Text style={styles.addButtonText}>Add a child</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background.primary,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      gap: spacing.md,
      maxHeight: '72%',
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      backgroundColor: colors.border.strong,
      borderRadius: radii.pill,
      height: 4,
      marginBottom: spacing.xs,
      width: 44,
    },
    heading: {
      ...typography.title,
      color: colors.text.primary,
      fontSize: 22,
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text.secondary,
      marginTop: -spacing.xs,
    },
    listScroll: {
      flexGrow: 0,
    },
    list: {
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    row: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    rowSelected: {
      borderColor: colors.brand.tealLight,
    },
    rowPressed: {
      opacity: 0.88,
    },
    avatar: {
      alignItems: 'center',
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 44,
    },
    avatarImage: {
      height: 44,
      width: 44,
    },
    avatarText: {
      fontSize: 22,
    },
    rowCopy: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    rowMeta: {
      ...typography.caption,
      color: colors.text.brand,
    },
    addButton: {
      alignItems: 'center',
      backgroundColor: colors.button.primary,
      borderRadius: radii.lg,
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      marginTop: spacing.xs,
      paddingVertical: spacing.md,
    },
    addButtonPressed: {
      opacity: 0.9,
    },
    addButtonText: {
      ...typography.label,
      color: colors.button.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
