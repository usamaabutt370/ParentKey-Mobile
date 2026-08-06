import { NativeModules, Platform } from 'react-native';

type AppInfoDeviceModule = {
  flavor?: string;
  getDeviceModelLabel?: () => Promise<string>;
};

const appInfoModule = NativeModules.AppInfo as AppInfoDeviceModule | undefined;

function jsFallbackDeviceLabel(): string {
  if (Platform.OS === 'android') {
    const constants = Platform.constants as {
      Brand?: string;
      Manufacturer?: string;
      Model?: string;
    };
    const model = constants.Model?.trim();
    const brand = (constants.Brand ?? constants.Manufacturer)?.trim();

    if (model) {
      if (brand && !model.toLowerCase().startsWith(brand.toLowerCase())) {
        return `${brand} ${model}`;
      }
      return model;
    }

    return 'Android device';
  }

  if (Platform.OS === 'ios') {
    const idiom = (
      Platform.constants as { interfaceIdiom?: string }
    ).interfaceIdiom;
    if (idiom === 'pad') {
      return 'iPad';
    }
    return 'iPhone';
  }

  return 'Device';
}

/**
 * Human-readable device model label for the current phone.
 * Prefers native marketing names (e.g. "realme C75", "iPhone 15 Pro").
 */
export async function getLocalDeviceLabel(): Promise<string> {
  try {
    const label = await appInfoModule?.getDeviceModelLabel?.();
    if (typeof label === 'string' && label.trim().length > 0) {
      return label.trim();
    }
  } catch {
    // Fall through to JS Platform.constants.
  }

  return jsFallbackDeviceLabel();
}
