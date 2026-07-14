import AsyncStorage from '@react-native-async-storage/async-storage';

const SETUP_VERSION = 'v1';

function onboardingKey(parentId: string): string {
  return `parent_onboarding_${SETUP_VERSION}_${parentId}`;
}

export async function isParentOnboardingComplete(
  parentId: string,
): Promise<boolean> {
  const value = await AsyncStorage.getItem(onboardingKey(parentId));
  return value === 'complete';
}

export async function markParentOnboardingComplete(
  parentId: string,
): Promise<void> {
  await AsyncStorage.setItem(onboardingKey(parentId), 'complete');
}

export async function clearParentOnboardingComplete(
  parentId: string,
): Promise<void> {
  await AsyncStorage.removeItem(onboardingKey(parentId));
}
