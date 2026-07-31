import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAndroidDeviceId } from './androidAppBlocking';
import { supabase } from './supabase';

const ACTIVE_PAIRING_SESSION_KEY = 'parent_active_pairing_session_v1';

export type PairingSession = {
  sessionId: string;
  token: string;
  expiresAt: string;
};

export type PairingMode = 'pair' | 'reconnect';

export type ValidatedPairingToken = {
  sessionId: string;
  parentId: string;
  mode: PairingMode;
  targetChildId: string | null;
};

type PairingSessionRow = {
  id: string;
  status: 'pending' | 'claimed' | 'expired' | 'cancelled';
  child_id: string | null;
  expires_at: string;
};

function generatePairingPassword(): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';

  for (let index = 0; index < 32; index += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

function buildPairingEmail(sessionId: string): string {
  return `pair-${sessionId}@device.parentkey.app`;
}

async function resolveDeviceKey(): Promise<string> {
  if (Platform.OS === 'android') {
    return getAndroidDeviceId();
  }

  return `ios-${Date.now()}`;
}

function mapPairingRpcError(message: string): string {
  if (
    message.includes('create_reconnect_session') ||
    message.includes('redeem_reconnect_token')
  ) {
    return 'Device reconnect is not set up on the server yet. Apply migration 019_reconnect_child_device.sql in the Supabase SQL Editor, then try again.';
  }

  if (
    message.includes('create_pairing_session') ||
    message.includes('validate_pairing_token') ||
    message.includes('schema cache')
  ) {
    return 'QR pairing is not set up on the server yet. Apply migration 010_pairing_sessions.sql in the Supabase SQL Editor, then try again.';
  }

  return message;
}

function readRpcObject(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return data as Record<string, unknown>;
}

export async function createPairingSession(): Promise<
  { ok: true; session: PairingSession } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc('create_pairing_session', {});

  if (error) {
    return { ok: false, message: mapPairingRpcError(error.message) };
  }

  const row = readRpcObject(data);

  if (
    !row ||
    typeof row.session_id !== 'string' ||
    typeof row.token !== 'string' ||
    typeof row.expires_at !== 'string'
  ) {
    return { ok: false, message: 'Could not start pairing. Please try again.' };
  }

  return {
    ok: true,
    session: {
      sessionId: row.session_id,
      token: row.token,
      expiresAt: row.expires_at,
    },
  };
}

/**
 * QR that re-attaches a device to an existing child instead of creating a new
 * account. Use when a child device fell back to the pairing screen.
 */
export async function createReconnectSession(
  childId: string,
): Promise<{ ok: true; session: PairingSession } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('create_reconnect_session', {
    p_child_id: childId,
  });

  if (error) {
    return { ok: false, message: mapPairingRpcError(error.message) };
  }

  const row = readRpcObject(data);

  if (
    !row ||
    typeof row.session_id !== 'string' ||
    typeof row.token !== 'string' ||
    typeof row.expires_at !== 'string'
  ) {
    return { ok: false, message: 'Could not start reconnect. Please try again.' };
  }

  return {
    ok: true,
    session: {
      sessionId: row.session_id,
      token: row.token,
      expiresAt: row.expires_at,
    },
  };
}

function isPairingSession(value: unknown): value is PairingSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const row = value as Record<string, unknown>;
  return (
    typeof row.sessionId === 'string' &&
    typeof row.token === 'string' &&
    typeof row.expiresAt === 'string'
  );
}

export async function saveActivePairingSession(
  session: PairingSession,
): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_PAIRING_SESSION_KEY, JSON.stringify(session));
}

export async function clearActivePairingSession(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_PAIRING_SESSION_KEY);
}

/** Returns a locally cached pairing QR session if it is still valid. */
export async function getActivePairingSession(): Promise<PairingSession | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_PAIRING_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPairingSession(parsed)) {
      await clearActivePairingSession();
      return null;
    }

    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      await clearActivePairingSession();
      return null;
    }

    return parsed;
  } catch {
    await clearActivePairingSession();
    return null;
  }
}

export async function validatePairingToken(
  token: string,
): Promise<
  { ok: true; pairing: ValidatedPairingToken } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc('validate_pairing_token', {
    p_token: token,
  });

  if (error) {
    return { ok: false, message: mapPairingRpcError(error.message) };
  }

  const row = readRpcObject(data);

  if (
    !row ||
    typeof row.session_id !== 'string' ||
    typeof row.parent_id !== 'string'
  ) {
    return {
      ok: false,
      message: 'This QR code is invalid or has expired. Ask your parent to create a new one.',
    };
  }

  return {
    ok: true,
    pairing: {
      sessionId: row.session_id,
      parentId: row.parent_id,
      mode: row.mode === 'reconnect' ? 'reconnect' : 'pair',
      targetChildId:
        typeof row.target_child_id === 'string' ? row.target_child_id : null,
    },
  };
}

export async function claimPairingWithToken(
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const validation = await validatePairingToken(token);

  if (!validation.ok) {
    return validation;
  }

  const { sessionId, parentId, mode } = validation.pairing;

  if (mode === 'reconnect') {
    return reconnectWithToken(token);
  }

  const password = generatePairingPassword();
  const email = buildPairingEmail(sessionId);
  const deviceKey = await resolveDeviceKey();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'child',
        parent_id: parentId,
        pairing_session_id: sessionId,
        device_key: deviceKey,
        first_name: 'Child',
        last_name: 'Device',
        full_name: 'Child Device',
      },
    },
  });

  if (error) {
    // Signup can report a 500 even when the child session was created (e.g. duplicate
    // scan). Prefer an active session over failing the claim UI.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      return { ok: true };
    }

    return { ok: false, message: mapPairingClaimError(error.message) };
  }

  if (!data.session) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      return { ok: true };
    }

    return {
      ok: false,
      message:
        'Device linked but sign in failed. Disable email confirmation in Supabase or try again.',
    };
  }

  return { ok: true };
}

/**
 * Signs this device back into an existing child account. The RPC rotates that
 * account's password and returns it once, so only the device holding the QR can
 * use it.
 */
async function reconnectWithToken(
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const deviceKey = await resolveDeviceKey();

  const { data, error } = await supabase.rpc('redeem_reconnect_token', {
    p_token: token,
    p_device_key: deviceKey,
  });

  if (error) {
    return { ok: false, message: mapPairingClaimError(error.message) };
  }

  const row = readRpcObject(data);

  if (!row || typeof row.email !== 'string' || typeof row.password !== 'string') {
    return {
      ok: false,
      message: 'Could not reconnect this device. Ask your parent for a new QR code.',
    };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: row.email,
    password: row.password,
  });

  if (signInError) {
    return { ok: false, message: mapPairingClaimError(signInError.message) };
  }

  return { ok: true };
}

export function subscribeToPairingSession(
  sessionId: string,
  onUpdate: (row: PairingSessionRow) => void,
): () => void {
  const channel = supabase
    .channel(`pairing-session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'pairing_sessions',
        filter: `id=eq.${sessionId}`,
      },
      payload => {
        onUpdate(payload.new as PairingSessionRow);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

function mapPairingClaimError(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('invalid or expired pairing session')) {
    return 'This QR code is no longer valid. Ask your parent to create a new one.';
  }

  if (
    lowerMessage.includes('no longer linked') ||
    lowerMessage.includes('no longer exists')
  ) {
    return 'That child account is no longer available. Ask your parent to add this device again.';
  }

  if (lowerMessage.includes('already registered')) {
    return 'This device is already linked. Sign out and try again, or ask your parent for a new QR code.';
  }

  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('database error') ||
    lowerMessage.includes('internal server') ||
    lowerMessage.includes('status code')
  ) {
    return 'Could not link this device. Ask your parent for a new QR code and try again.';
  }

  return 'Could not link this device. Please try scanning again.';
}
