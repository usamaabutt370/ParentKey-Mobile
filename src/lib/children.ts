import type { Session } from '@supabase/supabase-js';
import type { ChildProfileDraft } from '../types/child';
import { isValidEmail, type SignUpResult } from './auth';
import { supabase } from './supabase';

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
