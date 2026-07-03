import * as FileSystem from 'expo-file-system';

const memoryCache = new Map<string, string>();

function safeFileName(packageName: string): string {
  return packageName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeFilePath(iconUri: string): string {
  return iconUri.startsWith('file://') ? iconUri.slice('file://'.length) : iconUri;
}

export async function cacheIconBase64ToFile(
  packageName: string,
  iconBase64: string,
): Promise<string> {
  const cached = memoryCache.get(packageName);
  if (cached) {
    return cached;
  }

  const directory = `${FileSystem.cacheDirectory}app_icons`;
  const filePath = `${directory}/${safeFileName(packageName)}.png`;

  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const info = await FileSystem.getInfoAsync(filePath);
  if (!info.exists) {
    await FileSystem.writeAsStringAsync(filePath, iconBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  memoryCache.set(packageName, filePath);
  return filePath;
}

export async function readIconBase64FromUri(
  iconUri: string,
): Promise<string | null> {
  try {
    return await FileSystem.readAsStringAsync(normalizeFilePath(iconUri), {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return null;
  }
}

export async function resolveIconBase64ForSync(app: {
  packageName: string;
  iconUri?: string | null;
  iconBase64?: string | null;
}): Promise<string | null> {
  if (app.iconBase64) {
    return app.iconBase64;
  }

  if (!app.iconUri) {
    return null;
  }

  return readIconBase64FromUri(app.iconUri);
}
