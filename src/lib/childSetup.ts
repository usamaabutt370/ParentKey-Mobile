import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearChildAppInventoryCache } from './childAppInventoryCache';

const SETUP_VERSION = 'v2';

function setupKey(childId: string): string {
  return `child_setup_${SETUP_VERSION}_${childId}`;
}

export async function isChildSetupComplete(childId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(setupKey(childId));
  return value === 'complete';
}

export async function markChildSetupComplete(childId: string): Promise<void> {
  await AsyncStorage.setItem(setupKey(childId), 'complete');
}

export async function clearChildSetupComplete(childId: string): Promise<void> {
  await AsyncStorage.removeItem(setupKey(childId));
  clearChildAppInventoryCache(childId);
}
