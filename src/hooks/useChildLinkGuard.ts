import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { resetChildSession, verifyChildLink } from '../lib/childLink';

/**
 * If the parent deleted this child (or the session is invalid), clear local
 * setup state and sign out so the app returns to QR pairing.
 */
export function useChildLinkGuard() {
  const { session, signOut } = useAuth();
  const childId = session?.user.id;
  const resettingRef = useRef(false);

  const enforceLink = useCallback(async () => {
    if (!childId || resettingRef.current) {
      return;
    }

    const status = await verifyChildLink(childId);

    if (status.ok && status.linked) {
      return;
    }

    if (!status.ok) {
      return;
    }

    resettingRef.current = true;
    try {
      await resetChildSession({ childId, signOut });
    } finally {
      resettingRef.current = false;
    }
  }, [childId, signOut]);

  useEffect(() => {
    void enforceLink();

    const interval = setInterval(() => {
      void enforceLink();
    }, 4000);

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void enforceLink();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [enforceLink]);
}
