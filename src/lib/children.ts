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
  age: number | null;
  avatar_id: string | null;
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
  age,
  avatar_id,
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
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    fullName: profile?.full_name ?? null,
    parentId: row.parent_id,
    age: row.age,
    avatarId: row.avatar_id as ChildAvatarId | null,
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
