import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {
  AuthButton,
  AuthTextInput,
  ScreenLayout,
  useScreenStyles,
} from '../../components';
import { SUPPORT_EMAIL } from '../../constants/legalDocuments';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { deleteOwnAccount } from '../../lib/account';
import { updateParentProfile } from '../../lib/auth';
import type { SettingsStackParamList } from '../../navigation/types';
import { USER_ROLE_LABELS } from '../../types/auth';
import type { ColorPalette } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme';

/** Matches ParentTabNavigator tab bar content height (excluding safe-area inset). */
const TAB_BAR_CONTENT_HEIGHT = 56;

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

type SettingsRowProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
};

function SettingsRow({ icon, label, onPress }: SettingsRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createRowStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Feather color={colors.text.primary} name={icon} size={22} />
      <Text style={styles.rowLabel}>{label}</Text>
    </Pressable>
  );
}

export function ParentSettingsScreen({ navigation }: Props) {
  const screenStyles = useScreenStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.bottom),
    [colors, insets.bottom],
  );
  const { session, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);

  const metaFirstName = session?.user.user_metadata?.first_name;
  const metaLastName = session?.user.user_metadata?.last_name;
  const displayName =
    [metaFirstName, metaLastName].filter(Boolean).join(' ') || 'Parent account';
  const email = session?.user.email ?? '';
  const avatarLetter = (
    metaFirstName?.charAt(0) ??
    email.charAt(0) ??
    'P'
  ).toUpperCase();

  useEffect(() => {
    if (editingProfile) {
      return;
    }

    setFirstName(typeof metaFirstName === 'string' ? metaFirstName : '');
    setLastName(typeof metaLastName === 'string' ? metaLastName : '');
    setProfileError(null);
  }, [editingProfile, metaFirstName, metaLastName]);

  const openSupportEmail = async (subject: string) => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Contact support', `Email us at ${SUPPORT_EMAIL}`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Contact support', `Email us at ${SUPPORT_EMAIL}`);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message:
          'ParentKey helps families manage screen time and keep kids safer online. Download ParentKey to get started.',
        title: 'ParentKey',
      });
    } catch {
      // User dismissed share sheet.
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);

    const result = await updateParentProfile({ firstName, lastName });
    setSavingProfile(false);

    if (!result.ok) {
      setProfileError(result.message);
      return;
    }

    setEditingProfile(false);
    Alert.alert('Profile updated', 'Your name has been saved.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your parent account and all linked child accounts, blocked apps, and synced device data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);

              const result = await deleteOwnAccount();

              if (!result.ok) {
                setDeleting(false);
                Alert.alert('Could not delete account', result.message);
                return;
              }

              await signOut();
              setDeleting(false);
            })();
          },
        },
      ],
    );
  };

  return (
    <ScreenLayout
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <View style={screenStyles.header}>
        <Text style={screenStyles.title}>Settings</Text>
        <Text style={screenStyles.subtitle}>Account and app preferences</Text>
      </View>

      <View style={styles.profileSection}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setEditingProfile(current => {
              if (!current) {
                setFirstName(
                  typeof metaFirstName === 'string' ? metaFirstName : '',
                );
                setLastName(
                  typeof metaLastName === 'string' ? metaLastName : '',
                );
                setProfileError(null);
              }
              return !current;
            });
          }}
          style={({ pressed }) => [
            styles.profileCard,
            pressed && styles.profileCardPressed,
          ]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileMeta}>
              {USER_ROLE_LABELS.parent}
              {email ? ` · ${email}` : ''}
            </Text>
            <Text style={styles.profileHint}>
              {editingProfile ? 'Hide edit profile' : 'Tap to edit profile'}
            </Text>
          </View>
          <Feather
            color={colors.text.placeholder}
            name={editingProfile ? 'chevron-up' : 'chevron-right'}
            size={20}
          />
        </Pressable>

        {editingProfile ? (
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Edit profile</Text>
            <AuthTextInput
              autoCapitalize="words"
              autoCorrect={false}
              label="First name"
              onChangeText={setFirstName}
              placeholder="First name"
              textContentType="givenName"
              value={firstName}
            />
            <AuthTextInput
              autoCapitalize="words"
              autoCorrect={false}
              label="Last name"
              onChangeText={setLastName}
              placeholder="Last name"
              textContentType="familyName"
              value={lastName}
            />
            {profileError ? (
              <Text style={styles.profileError}>{profileError}</Text>
            ) : null}
            <AuthButton
              loading={savingProfile}
              onPress={() => void handleSaveProfile()}
              title="Save profile"
            />
          </View>
        ) : null}
      </View>

      <View style={styles.menuSection}>
        <SettingsRow
          icon="help-circle"
          label="Get help"
          onPress={() => {
            void openSupportEmail('ParentKey Help');
          }}
        />
        <SettingsRow
          icon="message-circle"
          label="Report a problem"
          onPress={() => {
            void openSupportEmail('ParentKey Problem Report');
          }}
        />
        <SettingsRow
          icon="share-2"
          label="Share app"
          onPress={() => {
            void handleShareApp();
          }}
        />
        <SettingsRow
          icon="shield"
          label="Privacy policy"
          onPress={() =>
            navigation.navigate('LegalDocument', { document: 'privacy' })
          }
        />
        <SettingsRow
          icon="info"
          label="Terms of use"
          onPress={() =>
            navigation.navigate('LegalDocument', { document: 'terms' })
          }
        />
      </View>

      <AuthButton onPress={signOut} title="Sign out" variant="secondary" />

      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Danger zone</Text>
        <Text style={styles.dangerBody}>
          Deleting your account removes your login and every linked child
          account. This cannot be undone.
        </Text>
        <AuthButton
          loading={deleting}
          onPress={handleDeleteAccount}
          title="Delete account"
          variant="secondary"
        />
      </View>
    </ScreenLayout>
  );
}

function createRowStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
      minHeight: 48,
      paddingVertical: spacing.sm,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowLabel: {
      ...typography.label,
      color: colors.text.primary,
      flex: 1,
      fontSize: 17,
      fontWeight: '500',
    },
  });
}

function createStyles(colors: ColorPalette, bottomInset: number) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
      paddingBottom: TAB_BAR_CONTENT_HEIGHT + bottomInset + spacing.xl,
    },
    profileSection: {
      gap: spacing.md,
    },
    profileCard: {
      alignItems: 'center',
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
    },
    profileCardPressed: {
      opacity: 0.88,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: colors.background.accentStrong,
      borderRadius: radii.pill,
      height: 52,
      justifyContent: 'center',
      width: 52,
    },
    avatarText: {
      ...typography.label,
      color: colors.text.brand,
      fontSize: 20,
    },
    profileInfo: {
      flex: 1,
      gap: 2,
    },
    profileName: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 18,
    },
    profileMeta: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    profileHint: {
      ...typography.caption,
      color: colors.text.brand,
      marginTop: 2,
    },
    editCard: {
      backgroundColor: colors.input.background,
      borderColor: colors.border.default,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    editTitle: {
      ...typography.label,
      color: colors.text.primary,
      fontSize: 16,
    },
    profileError: {
      ...typography.caption,
      color: colors.error,
    },
    menuSection: {
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    dangerSection: {
      gap: spacing.sm,
    },
    dangerTitle: {
      ...typography.label,
      color: colors.error,
      fontSize: 16,
    },
    dangerBody: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: 20,
    },
  });
}
