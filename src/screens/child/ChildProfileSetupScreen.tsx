import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AuthButton,
  AuthTextInput,
  ScreenLayout,
} from '../../components';
import { ChildProfilePhotoPicker } from '../../components/child/ChildProfilePhotoPicker';
import { ChildSetupStepLayout } from '../../components/child/ChildSetupStepLayout';
import { InfoTipCard } from '../../components/parent';
import { CHILD_SETUP_TOTAL_STEPS } from '../../constants/childSetup';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { uploadChildAvatar } from '../../lib/childAvatar';
import { updateOwnChildProfile } from '../../lib/children';
import type { ChildStackParamList } from '../../navigation/types';
import type { ColorPalette } from '../../theme/colors';
import { spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ChildStackParamList, 'ChildProfileSetup'>;

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  age?: string;
};

export function ChildProfileSetupScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(current =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  };

  const validate = () => {
    const errors: FieldErrors = {};

    if (!firstName.trim()) {
      errors.firstName = 'First name is required.';
    }

    if (!lastName.trim()) {
      errors.lastName = 'Last name is required.';
    }

    if (!age.trim()) {
      errors.age = 'Age is required.';
    } else {
      const parsedAge = Number(age);
      if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 17) {
        errors.age = 'Enter a valid age between 1 and 17.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinue = async () => {
    setFormError(null);

    if (!validate()) {
      return;
    }

    const childId = session?.user.id;
    if (!childId) {
      setFormError('Your session expired. Scan the QR code again.');
      return;
    }

    setSaving(true);

    let avatarUrl: string | null = null;
    if (photoUri) {
      const uploadResult = await uploadChildAvatar({
        childId,
        localUri: photoUri,
      });

      if (!uploadResult.ok) {
        setSaving(false);
        setFormError(uploadResult.message);
        return;
      }

      avatarUrl = uploadResult.publicUrl;
    }

    const result = await updateOwnChildProfile({
      childId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age: Number(age),
      avatarUrl,
    });
    setSaving(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    navigation.navigate('ChildPermissions');
  };

  return (
    <ScreenLayout
      keyboardAvoiding
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      scrollable
      contentStyle={styles.content}>
      <ChildSetupStepLayout
        currentStep={2}
        subtitle="Add a photo and tell us who uses this device so your parent can recognize it."
        title="About you"
        totalSteps={CHILD_SETUP_TOTAL_STEPS}>
        <ChildProfilePhotoPicker imageUri={photoUri} onChange={setPhotoUri} />

        <View style={styles.form}>
          <AuthTextInput
            autoCapitalize="words"
            autoComplete="name-given"
            error={fieldErrors.firstName}
            label="First name"
            onChangeText={text => {
              setFirstName(text);
              clearFieldError('firstName');
            }}
            placeholder="First name"
            textContentType="givenName"
            value={firstName}
          />
          <AuthTextInput
            autoCapitalize="words"
            autoComplete="name-family"
            error={fieldErrors.lastName}
            label="Last name"
            onChangeText={text => {
              setLastName(text);
              clearFieldError('lastName');
            }}
            placeholder="Last name"
            textContentType="familyName"
            value={lastName}
          />
          <AuthTextInput
            error={fieldErrors.age}
            keyboardType="number-pad"
            label="Age"
            maxLength={2}
            onChangeText={text => {
              setAge(text.replace(/[^0-9]/g, ''));
              clearFieldError('age');
            }}
            placeholder="e.g. 10"
            value={age}
          />
        </View>

        <InfoTipCard message="Your parent will see this name and photo on their Children list after setup." />

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <AuthButton
          loading={saving}
          onPress={() => void handleContinue()}
          title="Continue to permissions"
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
    form: {
      gap: spacing.md,
    },
    formError: {
      ...typography.body,
      color: colors.error,
      textAlign: 'center',
    },
  });
}
