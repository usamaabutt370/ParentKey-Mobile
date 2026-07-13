import { clearChildSetupComplete } from './childSetup';
import { supabase } from './supabase';

export type ChildLinkStatus =
  | { ok: true; linked: true }
  | { ok: true; linked: false; reason: 'missing_link' | 'invalid_session' }
  | { ok: false; message: string };

/**
 * Confirms the signed-in child still has a `children` row linked to a parent.
 * After a parent deletes the child, this returns linked: false.
 */
export async function verifyChildLink(
  childId: string,
): Promise<ChildLinkStatus> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    return { ok: true, linked: false, reason: 'invalid_session' };
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
    const lower = error.message.toLowerCase();
    if (
      lower.includes('jwt') ||
      lower.includes('not authenticated') ||
      lower.includes('user not found') ||
      error.code === 'PGRST301'
    ) {
      return { ok: true, linked: false, reason: 'invalid_session' };
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
