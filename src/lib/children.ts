import type { Session } from '@supabase/supabase-js';
import type { ChildAvatarId, ChildProfile, ChildProfileDraft } from '../types/child';
import { isValidEmail, type SignUpResult } from './auth';
import { supabase } from './supabase';

type JoinedProfile = {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
};

type ChildRow = {
  profile_id: string;
  parent_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  age: number | null;
  avatar_id: string | null;
  avatar_url: string | null;
  uninstall_allowed: boolean | null;
  created_at: string;
  updated_at: string;
  profiles: JoinedProfile | JoinedProfile[] | null;
};

function getJoinedProfile(
  profiles: ChildRow['profiles'],
): JoinedProfile | null {
  if (Array.isArray(profiles)) {
    return profiles[0] ?? null;
  }

  return profiles;
}

export function getChildDisplayName(child: ChildProfile): string {
  if (child.fullName?.trim()) {
    return child.fullName.trim();
  }

  const parts = [child.firstName, child.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }

  return child.email ?? 'Child';
}

const CHILD_SELECT = `
  profile_id,
  parent_id,
  first_name,
  last_name,
  full_name,
  age,
  avatar_id,
  avatar_url,
  uninstall_allowed,
  created_at,
  updated_at,
  profiles:profile_id (
    email,
    first_name,
    last_name,
    full_name
  )
`;

function mapChildRow(row: ChildRow): ChildProfile {
  const profile = getJoinedProfile(row.profiles);

  return {
    id: row.profile_id,
    email: profile?.email ?? null,
    firstName: row.first_name ?? profile?.first_name ?? null,
    lastName: row.last_name ?? profile?.last_name ?? null,
    fullName: row.full_name ?? profile?.full_name ?? null,
    parentId: row.parent_id,
    age: row.age,
    avatarId: row.avatar_id as ChildAvatarId | null,
    avatarUrl: row.avatar_url?.trim() ? row.avatar_url : null,
    uninstallAllowed: row.uninstall_allowed === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchParentChildren(
  parentId: string,
): Promise<{ ok: true; children: ChildProfile[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('children')
    .select(CHILD_SELECT)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    children: (data as unknown as ChildRow[]).map(mapChildRow),
  };
}

export async function fetchChildById(
  parentId: string,
  childId: string,
): Promise<{ ok: true; child: ChildProfile } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('children')
    .select(CHILD_SELECT)
    .eq('parent_id', parentId)
    .eq('profile_id', childId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!data) {
    return { ok: false, message: 'Child not found.' };
  }

  return { ok: true, child: mapChildRow(data as unknown as ChildRow) };
}

export type CreateChildAccountParams = {
  parentSession: Session;
  profile: ChildProfileDraft;
  email: string;
  password: string;
};

export async function createChildAccount({
  parentSession,
  profile,
  email,
  password,
}: CreateChildAccountParams): Promise<SignUpResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!isValidEmail(trimmedEmail)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  if (password.length < 6) {
    return {
      ok: false,
      message: 'Password must be at least 6 characters.',
    };
  }

  const parentTokens = {
    access_token: parentSession.access_token,
    refresh_token: parentSession.refresh_token,
  };

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        first_name: profile.firstName,
        last_name: profile.lastName,
        full_name: `${profile.firstName} ${profile.lastName}`,
        role: 'child',
        age: profile.age,
        avatar_id: profile.avatarId,
        parent_id: parentSession.user.id,
      },
    },
  });

  if (error) {
    return { ok: false, message: mapCreateChildError(error.message) };
  }

  if (!data.user) {
    return { ok: false, message: 'Could not create child account. Please try again.' };
  }

  const { data: currentSessionData } = await supabase.auth.getSession();
  const activeSession = currentSessionData.session;

  if (
    activeSession &&
    activeSession.user.id !== parentSession.user.id
  ) {
    await supabase.auth.signOut();

    const { error: restoreError } = await supabase.auth.setSession(parentTokens);

    if (restoreError) {
      return {
        ok: false,
        message:
          'Child account was created but your session could not be restored. Please sign in again.',
      };
    }
  }

  return { ok: true };
}

function mapCreateChildError(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('already registered')) {
    return 'An account with this email already exists. Use a different email.';
  }

  if (lowerMessage.includes('password')) {
    return 'Password does not meet requirements. Use at least 6 characters.';
  }

  return message;
}

export async function updateOwnChildProfile(params: {
  childId: string;
  firstName: string;
  lastName: string;
  age?: number;
  avatarUrl?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const firstName = params.firstName.trim();
  const lastName = params.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();

  if (!firstName || !lastName) {
    return { ok: false, message: 'First name and last name are required.' };
  }

  if (
    params.age != null &&
    (!Number.isInteger(params.age) || params.age < 1 || params.age > 17)
  ) {
    return { ok: false, message: 'Enter a valid age between 1 and 17.' };
  }

  const { error: childrenError } = await supabase
    .from('children')
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      age: params.age ?? null,
      ...(params.avatarUrl !== undefined
        ? { avatar_url: params.avatarUrl }
        : {}),
    })
    .eq('profile_id', params.childId);

  if (childrenError) {
    return { ok: false, message: childrenError.message };
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
    })
    .eq('id', params.childId);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  await supabase.auth.updateUser({
    data: {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      age: params.age ?? null,
      ...(params.avatarUrl !== undefined
        ? { avatar_url: params.avatarUrl }
        : {}),
    },
  });

  return { ok: true };
}

export async function setChildUninstallAllowed(params: {
  parentId: string;
  childId: string;
  allowed: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const verifyResult = await fetchChildById(params.parentId, params.childId);

  if (!verifyResult.ok) {
    return verifyResult;
  }

  const { error } = await supabase
    .from('children')
    .update({ uninstall_allowed: params.allowed })
    .eq('parent_id', params.parentId)
    .eq('profile_id', params.childId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function fetchOwnChildUninstallAllowed(
  childId: string,
): Promise<{ ok: true; allowed: boolean } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('children')
    .select('uninstall_allowed')
    .eq('profile_id', childId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, allowed: data?.uninstall_allowed === true };
}

export function subscribeToChildUninstallAllowed(
  childId: string,
  onUpdate: (allowed: boolean) => void,
): () => void {
  const channel = supabase
    .channel(`child-uninstall-${childId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'children',
        filter: `profile_id=eq.${childId}`,
      },
      payload => {
        const next = payload.new as { uninstall_allowed?: boolean };
        onUpdate(next.uninstall_allowed === true);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function deleteChildAccount(params: {
  parentId: string;
  childId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const verifyResult = await fetchChildById(params.parentId, params.childId);

  if (!verifyResult.ok) {
    return verifyResult;
  }

  const { error } = await supabase.rpc('delete_child_account', {
    target_child_id: params.childId,
  });

  if (error) {
    return { ok: false, message: mapDeleteChildError(error.message) };
  }

  return { ok: true };
}

function mapDeleteChildError(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('permission') || lowerMessage.includes('not found')) {
    return 'You do not have permission to delete this child account.';
  }

  if (
    lowerMessage.includes('delete_child_account') &&
    lowerMessage.includes('does not exist')
  ) {
    return 'Delete is not available yet. Apply the latest database migration and try again.';
  }

  return message;
}
