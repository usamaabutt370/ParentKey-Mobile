import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../context/AuthContext';
import {
  clearPendingLinkChild,
  clearPreAuthSetupRoute,
  hasPendingLinkChild,
} from '../lib/pendingParentAction';
import { clearActivePairingSession } from '../lib/pairing';
import { markParentOnboardingComplete } from '../lib/parentOnboarding';
import { hideSplashWhenReady } from '../lib/splash';
import { ParentOnboardingNavigator } from '../navigation/ParentOnboardingNavigator';
import { ParentTabNavigator } from '../navigation/ParentTabNavigator';

type ParentSetupContextValue = {
  finishOnboarding: () => Promise<void>;
};

const ParentSetupContext = createContext<ParentSetupContextValue | null>(null);

export function useParentSetup(): ParentSetupContextValue {
  const value = useContext(ParentSetupContext);
  if (!value) {
    throw new Error('useParentSetup must be used inside ParentSetupGate');
  }
  return value;
}

export function useParentSetupOptional(): ParentSetupContextValue | null {
  return useContext(ParentSetupContext);
}

export function ParentSetupGate() {
  const { session } = useAuth();
  const parentId = session?.user.id;
  const [checking, setChecking] = useState(true);
  const [needsLinkChildFlow, setNeedsLinkChildFlow] = useState(false);

  const evaluate = useCallback(async () => {
    if (!parentId) {
      setNeedsLinkChildFlow(false);
      setChecking(false);
      return;
    }

    setChecking(true);

    const pendingLink = await hasPendingLinkChild();
    if (pendingLink) {
      await clearPreAuthSetupRoute();
      setNeedsLinkChildFlow(true);
      setChecking(false);
      return;
    }

    // Signup / login alone should land on the dashboard. Child linking is
    // opt-in via "Add child" / "Link a child", including the pending-auth path.
    await clearPreAuthSetupRoute();
    await markParentOnboardingComplete(parentId);
    setNeedsLinkChildFlow(false);
    setChecking(false);
  }, [parentId]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  const finishOnboarding = useCallback(async () => {
    if (!parentId) {
      return;
    }

    await clearPendingLinkChild();
    await clearActivePairingSession();
    await clearPreAuthSetupRoute();
    await markParentOnboardingComplete(parentId);
    setNeedsLinkChildFlow(false);
  }, [parentId]);

  const contextValue = useMemo(
    () => ({ finishOnboarding }),
    [finishOnboarding],
  );

  useEffect(() => {
    if (!checking) {
      hideSplashWhenReady();
    }
  }, [checking]);

  // Stay under the native splash — no blank/spinner frame.
  if (checking) {
    return null;
  }

  return (
    <ParentSetupContext.Provider value={contextValue}>
      {needsLinkChildFlow ? (
        <ParentOnboardingNavigator />
      ) : (
        <ParentTabNavigator />
      )}
    </ParentSetupContext.Provider>
  );
}
