import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchParentChildren } from '../lib/children';
import type { ChildProfile } from '../types/child';

export function useParentChildren() {
  const { session } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const parentId = session?.user.id;

    if (!parentId) {
      setChildren([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await fetchParentChildren(parentId);

    if (result.ok) {
      setChildren(result.children);
    } else {
      setChildren([]);
      setError(result.message);
    }

    setLoading(false);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { children, loading, error, refresh };
}
