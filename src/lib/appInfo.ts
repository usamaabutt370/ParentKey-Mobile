import { NativeModules, Platform } from 'react-native';

export type AppVariant = 'parent' | 'child' | null;

type AppInfoModule = {
  flavor: string;
};

const appInfoModule = NativeModules.AppInfo as AppInfoModule | undefined;

function resolveAppVariant(): AppVariant {
  if (Platform.OS !== 'android') {
    return null;
  }

  const flavor = appInfoModule?.flavor;
  return flavor === 'parent' || flavor === 'child' ? flavor : null;
}

export const APP_VARIANT: AppVariant = resolveAppVariant();
