import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  signUpUser,
  type SignUpParams,
  type SignUpResult,
} from '../lib/auth';
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
  signIn: (params: SignInParams) => Promise<string | null>;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const role = useMemo(() => getRoleFromSession(session), [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

    return null;
  }, []);

  const signUp = useCallback(
    (params: SignUpParams) => signUpUser(params),
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ session, role, loading, signIn, signUp, signOut }),
    [session, role, loading, signIn, signUp, signOut],
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
