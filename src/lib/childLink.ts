import { clearChildSetupComplete } from './childSetup';
import { supabase } from './supabase';

export type ChildLinkStatus =
  | { ok: true; linked: true }
  | { ok: true; linked: false; reason: 'missing_link' | 'invalid_session' }
  | { ok: false; message: string };

function isAuthFailureMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('jwt') ||
    lower.includes('not authenticated') ||
    lower.includes('user not found') ||
    lower.includes('invalid refresh') ||
    lower.includes('refresh token') ||
    lower.includes('session not found')
  );
}

/**
 * Confirms the signed-in child still has a `children` row linked to a parent.
 * After a parent deletes the child, this returns linked: false.
 *
 * Transient offline / token-refresh blips return `{ ok: false }` so the app
 * does NOT sign the child out back to QR pairing.
 */
export async function verifyChildLink(
  childId: string,
): Promise<ChildLinkStatus> {
  let { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    // Storage / transport glitch — retry later, do not unlink.
    return { ok: false, message: sessionError.message };
  }

  if (!sessionData.session) {
    // Session may be mid-refresh after idle. Try once before declaring invalid.
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshError) {
      if (isAuthFailureMessage(refreshError.message)) {
        return { ok: true, linked: false, reason: 'invalid_session' };
      }
      return { ok: false, message: refreshError.message };
    }

    if (!refreshed.session) {
      // Still nothing — likely a real signed-out state.
      return { ok: true, linked: false, reason: 'invalid_session' };
    }

    sessionData = refreshed;
  }

  if (sessionData.session.user.id !== childId) {
    return { ok: true, linked: false, reason: 'invalid_session' };
  }

  const { data, error } = await supabase
    .from('children')
    .select('profile_id')
    .eq('profile_id', childId)
    .maybeSingle();

  if (error) {
    if (isAuthFailureMessage(error.message) || error.code === 'PGRST301') {
      // One refresh + retry before treating as signed-out.
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError && isAuthFailureMessage(refreshError.message)) {
        return { ok: true, linked: false, reason: 'invalid_session' };
      }

      const retry = await supabase
        .from('children')
        .select('profile_id')
        .eq('profile_id', childId)
        .maybeSingle();

      if (retry.error) {
        if (
          isAuthFailureMessage(retry.error.message) ||
          retry.error.code === 'PGRST301'
        ) {
          return { ok: true, linked: false, reason: 'invalid_session' };
        }
        return { ok: false, message: retry.error.message };
      }

      if (!retry.data) {
        return { ok: true, linked: false, reason: 'missing_link' };
      }

      return { ok: true, linked: true };
    }

    return { ok: false, message: error.message };
  }

  if (!data) {
    return { ok: true, linked: false, reason: 'missing_link' };
  }

  return { ok: true, linked: true };
}

export async function resetChildSession(params: {
  childId?: string | null;
  signOut: () => Promise<void>;
}): Promise<void> {
  if (params.childId) {
    await clearChildSetupComplete(params.childId);
  }

  await params.signOut();
}
