import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

type Props = {
  imageUri: string | null;
  onChange: (uri: string | null) => void;
};

export function ChildProfilePhotoPicker({ imageUri, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [picking, setPicking] = useState(false);

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera access needed',
        'Allow camera access to take a profile photo.',
      );
      return;
    }

    setPicking(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        onChange(result.assets[0].uri);
      }
    } finally {
      setPicking(false);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access to choose a profile photo.',
      );
      return;
    }

    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        onChange(result.assets[0].uri);
      }
    } finally {
      setPicking(false);
    }
  };

  const openPicker = () => {
    Alert.alert('Profile photo', 'Add a photo of yourself', [
      { text: 'Take photo', onPress: () => void pickFromCamera() },
      { text: 'Choose from gallery', onPress: () => void pickFromGallery() },
      ...(imageUri
        ? [
            {
              text: 'Remove photo',
              style: 'destructive' as const,
              onPress: () => onChange(null),
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={picking}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.avatarButton,
          pressed && styles.avatarButtonPressed,
        ]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.placeholder}>
            <Feather color={colors.text.brand} name="camera" size={28} />
          </View>
        )}
        <View style={styles.badge}>
          {picking ? (
            <ActivityIndicator color={colors.button.text} size="small" />
          ) : (
            <Feather color={colors.button.text} name="plus" size={14} />
          )}
        </View>
      </Pressable>
      <Text style={styles.hint}>
        {imageUri ? 'Tap to change photo' : 'Add a profile photo'}
      </Text>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatarButton: {
      height: 112,
      width: 112,
    },
    avatarButtonPressed: {
      opacity: 0.85,
    },
    avatarImage: {
      borderColor: colors.brand.teal,
      borderRadius: 56,
      borderWidth: 3,
      height: 112,
      width: 112,
    },
    placeholder: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderColor: colors.brand.teal,
      borderRadius: 56,
      borderStyle: 'dashed',
      borderWidth: 2,
      height: 112,
      justifyContent: 'center',
      width: 112,
    },
    badge: {
      alignItems: 'center',
      backgroundColor: colors.brand.teal,
      borderColor: colors.background.primary,
      borderRadius: 14,
      borderWidth: 2,
      bottom: 2,
      height: 28,
      justifyContent: 'center',
      position: 'absolute',
      right: 2,
      width: 28,
    },
    hint: {
      ...typography.caption,
      color: colors.text.secondary,
      textAlign: 'center',
    },
  });
}
