import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { resetChildSession, verifyChildLink } from '../lib/childLink';

/** Require several confirmed failures before wiping the child back to QR. */
const UNLINK_CONFIRMATIONS_REQUIRED = 3;
const LINK_CHECK_INTERVAL_MS = 15_000;

/**
 * If the parent deleted this child (or the session is permanently invalid),
 * clear local setup state and sign out so the app returns to QR pairing.
 *
 * Transient network / token-refresh failures must NOT sign the child out.
 */
export function useChildLinkGuard() {
  const { session, signOut } = useAuth();
  const childId = session?.user.id;
  const resettingRef = useRef(false);
  const unlinkStrikesRef = useRef(0);

  const enforceLink = useCallback(async () => {
    if (!childId || resettingRef.current) {
      return;
    }

    const status = await verifyChildLink(childId);

    if (status.ok && status.linked) {
      unlinkStrikesRef.current = 0;
      return;
    }

    // Soft failure (offline, timeout, refresh in progress) — keep session.
    if (!status.ok) {
      return;
    }

    unlinkStrikesRef.current += 1;
    if (unlinkStrikesRef.current < UNLINK_CONFIRMATIONS_REQUIRED) {
      return;
    }

    resettingRef.current = true;
    unlinkStrikesRef.current = 0;
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
    }, LINK_CHECK_INTERVAL_MS);

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
