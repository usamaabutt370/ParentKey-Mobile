import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchParentChildren } from '../lib/children';
import type { ChildProfile } from '../types/child';

export function useParentChildren() {
  const { session } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const parentId = session?.user.id;
      const silent = options?.silent === true;

      if (!parentId) {
        setChildren([]);
        setLoading(false);
        setError(null);
        hasLoadedRef.current = false;
        return;
      }

      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const result = await fetchParentChildren(parentId);

      if (result.ok) {
        setChildren(result.children);
      } else {
        setChildren([]);
        setError(result.message);
      }

      setLoading(false);
      hasLoadedRef.current = true;
    },
    [session?.user.id],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh({ silent: hasLoadedRef.current });
    }, [refresh]),
  );

  return { children, loading, error, refresh };
}
