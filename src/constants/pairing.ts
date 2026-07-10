export const PAIRING_SCHEME = 'parentkey';
export const PAIRING_HOST = 'pair';
export const PAIRING_QR_PREFIX = `${PAIRING_SCHEME}://${PAIRING_HOST}?token=`;

export function buildPairingQrValue(token: string): string {
  return `${PAIRING_QR_PREFIX}${token}`;
}

export function parsePairingTokenFromQr(data: string): string | null {
  const trimmed = data.trim();

  if (trimmed.startsWith(PAIRING_QR_PREFIX)) {
    const token = trimmed.slice(PAIRING_QR_PREFIX.length).trim();
    return token.length > 0 ? token : null;
  }

  try {
    const url = new URL(trimmed);
    if (
      url.protocol === `${PAIRING_SCHEME}:` &&
      url.hostname === PAIRING_HOST
    ) {
      const token = url.searchParams.get('token')?.trim();
      return token ? token : null;
    }
  } catch {
    return null;
  }

  return null;
}
