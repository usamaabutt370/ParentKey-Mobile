import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Linking } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import {
  createSessionFromAuthUrl,
  isPasswordRecoveryUrl,
  requestPasswordReset,
  signUpUser,
  updatePassword,
  type AuthActionResult,
  type SignUpParams,
  type SignUpResult,
} from '../lib/auth';
import {
  clearDeviceRoleChoice,
  clearParentWelcomeVisited,
  clearPendingLinkChild,
  clearPreAuthSetupRoute,
} from '../lib/pendingParentAction';
import { supabase } from '../lib/supabase';
import {
  getRoleFromSession,
  type UserRole,
} from '../types/auth';

type SignInParams = {
  email: string;
  password: string;
};

type AuthContextValue = {
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  passwordRecoveryPending: boolean;
  signIn: (params: SignInParams) => Promise<string | null>;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  clearPasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);

  const role = useMemo(() => getRoleFromSession(session), [session]);

  const handleAuthRedirect = useCallback(async (url: string | null) => {
    if (!url || !isPasswordRecoveryUrl(url)) {
      return;
    }

    const result = await createSessionFromAuthUrl(url);

    if (result.ok) {
      setPasswordRecoveryPending(true);
      return;
    }

    console.warn('Password recovery link failed:', result.message);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryPending(true);
      }
    });

    void Linking.getInitialURL().then(handleAuthRedirect);

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthRedirect(url);
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [handleAuthRedirect]);

  const signIn = useCallback(async ({ email, password }: SignInParams) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return 'Email confirmation is required. Turn off Confirm email in Supabase Authentication settings.';
      }
      return error.message;
    }

    const accountRole = getRoleFromSession(data.session);

    if (!accountRole) {
      await supabase.auth.signOut();
      return 'This account does not have a valid role. Please sign up again or contact support.';
    }

    setPasswordRecoveryPending(false);
    return null;
  }, []);

  const signUp = useCallback(
    (params: SignUpParams) => signUpUser(params),
    [],
  );

  const signOut = useCallback(async () => {
    setPasswordRecoveryPending(false);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Account may already be deleted by the parent; clear local session anyway.
    }
    await Promise.all([
      clearPendingLinkChild(),
      clearPreAuthSetupRoute(),
      clearDeviceRoleChoice(),
      clearParentWelcomeVisited(),
    ]);
    setSession(null);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecoveryPending(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      role,
      loading,
      passwordRecoveryPending,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      clearPasswordRecovery,
    }),
    [
      session,
      role,
      loading,
      passwordRecoveryPending,
      signIn,
      signUp,
      signOut,
      clearPasswordRecovery,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
