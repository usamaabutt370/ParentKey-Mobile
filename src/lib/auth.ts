import { supabase } from './supabase';
import type { UserRole } from '../types/auth';

export type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

export type SignUpResult =
  | { ok: true }
  | { ok: false; message: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export async function signUpUser({
  email,
  password,
  firstName,
  lastName,
  role,
}: SignUpParams): Promise<SignUpResult> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();

  if (!isValidEmail(trimmedEmail)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        full_name: `${trimmedFirstName} ${trimmedLastName}`,
        role,
      },
    },
  });

  if (error) {
    return { ok: false, message: mapSignUpError(error.message) };
  }

  if (!data.user) {
    return { ok: false, message: 'Sign up failed. Please try again.' };
  }

  if (!data.session) {
    return {
      ok: false,
      message:
        'Account created but sign in failed. Disable email confirmation in Supabase or verify your email.',
    };
  }

  return { ok: true };
}

function mapSignUpError(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  if (lowerMessage.includes('password')) {
    return 'Password does not meet requirements. Use at least 6 characters.';
  }

  return message;
}
