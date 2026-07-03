import { supabase } from './supabase';
import { PASSWORD_RESET_REDIRECT_URL } from '../constants/auth';

export type AuthActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
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
        role: 'parent',
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

export async function requestPasswordReset(
  email: string,
): Promise<AuthActionResult> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!isValidEmail(trimmedEmail)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo: PASSWORD_RESET_REDIRECT_URL,
  });

  if (error) {
    return { ok: false, message: mapPasswordResetError(error.message) };
  }

  return { ok: true };
}

export async function updatePassword(
  password: string,
): Promise<AuthActionResult> {
  if (password.length < 6) {
    return {
      ok: false,
      message: 'Password must be at least 6 characters.',
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

type AuthUrlTokens = {
  accessToken: string;
  refreshToken: string;
  type: string | null;
};

export function parseAuthRedirectUrl(url: string): AuthUrlTokens | null {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const paramString =
    hashIndex >= 0
      ? url.slice(hashIndex + 1)
      : queryIndex >= 0
        ? url.slice(queryIndex + 1)
        : '';

  if (!paramString) {
    return null;
  }

  const params = new URLSearchParams(paramString);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    type: params.get('type'),
  };
}

export function isPasswordRecoveryUrl(url: string): boolean {
  if (!url.includes('reset-password')) {
    return false;
  }

  const tokens = parseAuthRedirectUrl(url);
  return tokens?.type === 'recovery';
}

export async function createSessionFromAuthUrl(
  url: string,
): Promise<AuthActionResult> {
  const tokens = parseAuthRedirectUrl(url);

  if (!tokens) {
    return {
      ok: false,
      message: 'This reset link is invalid or has expired.',
    };
  }

  const { error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

function mapPasswordResetError(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('rate limit')) {
    return 'Too many requests. Please wait a few minutes and try again.';
  }

  if (
    lowerMessage.includes('redirect') &&
    (lowerMessage.includes('invalid') || lowerMessage.includes('not allowed'))
  ) {
    return (
      'Password reset is not configured yet. In Supabase go to Authentication → ' +
      'URL Configuration and add parentkey://reset-password to Redirect URLs.'
    );
  }

  if (lowerMessage.includes('email') && lowerMessage.includes('disabled')) {
    return 'Password reset emails are disabled in Supabase. Enable them under Authentication → Email Templates.';
  }

  return message;
}
