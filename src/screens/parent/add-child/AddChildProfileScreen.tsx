import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AuthButton,
  AuthTextInput,
  ScreenLayout,
} from '../../../components';
import {
  AvatarPicker,
  InfoTipCard,
  ScreenHeader,
} from '../../../components/parent';
import { useTheme } from '../../../context/ThemeContext';
import type { ChildrenStackParamList } from '../../../navigation/types';
import type { ChildAvatarId } from '../../../types/child';
import type { ColorPalette } from '../../../theme/colors';
import { spacing } from '../../../theme';

type Props = NativeStackScreenProps<ChildrenStackParamList, 'AddChildProfile'>;

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  age?: string;
};

export function AddChildProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [avatarId, setAvatarId] = useState<ChildAvatarId | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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

    if (age.trim()) {
      const parsedAge = Number(age);
      if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 17) {
        errors.age = 'Enter a valid age between 1 and 17.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) {
      return;
    }

    navigation.navigate('AddChildAccount', {
      profile: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: age.trim() || undefined,
        avatarId,
      },
    });
  };

  return (
    <ScreenLayout
      keyboardAvoiding
      safeAreaEdges={['top', 'left', 'right']}
      scrollable
      contentStyle={styles.content}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        stepLabel="Step 1 of 2"
        subtitle="Basic info for their account"
        title="Child profile"
      />

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
          label="Age (optional)"
          maxLength={2}
          onChangeText={text => {
            setAge(text.replace(/[^0-9]/g, ''));
            clearFieldError('age');
          }}
          placeholder="e.g. 10"
          value={age}
        />
        <AvatarPicker onChange={setAvatarId} value={avatarId} />
      </View>

      <InfoTipCard message="On the next step you will set the email and password your child uses to sign in on their device." />

      <View style={styles.footer}>
        <AuthButton onPress={handleContinue} title="Continue" />
        <Text style={styles.backLink} onPress={() => navigation.goBack()}>
          Back
        </Text>
      </View>
    </ScreenLayout>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
    },
    form: {
      gap: spacing.md,
    },
    footer: {
      gap: spacing.md,
      marginTop: 'auto',
      paddingBottom: spacing.sm,
    },
    backLink: {
      color: colors.text.brand,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
