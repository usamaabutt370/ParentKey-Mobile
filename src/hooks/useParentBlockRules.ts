import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  fetchParentBlockRules,
  groupBlockRulesByChild,
  type AppBlockRule,
  type ChildBlockSummary,
} from '../lib/appRules';
import { fetchParentChildren, getChildDisplayName } from '../lib/children';

export function useParentBlockRules() {
  const { session } = useAuth();
  const [rules, setRules] = useState<AppBlockRule[]>([]);
  const [summaries, setSummaries] = useState<ChildBlockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const parentId = session?.user.id;
      const silent = options?.silent === true;

      if (!parentId) {
        setRules([]);
        setSummaries([]);
        setLoading(false);
        setError(null);
        hasLoadedRef.current = false;
        return;
      }

      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const [rulesResult, childrenResult] = await Promise.all([
        fetchParentBlockRules(parentId),
        fetchParentChildren(parentId),
      ]);

      if (!rulesResult.ok) {
        setRules([]);
        setSummaries([]);
        setError(rulesResult.message);
        setLoading(false);
        hasLoadedRef.current = true;
        return;
      }

      if (!childrenResult.ok) {
        setRules(rulesResult.rules);
        setSummaries(groupBlockRulesByChild(rulesResult.rules, {}));
        setError(childrenResult.message);
        setLoading(false);
        hasLoadedRef.current = true;
        return;
      }

      const childNames = Object.fromEntries(
        childrenResult.children.map(child => [
          child.id,
          getChildDisplayName(child),
        ]),
      );

      setRules(rulesResult.rules);
      setSummaries(groupBlockRulesByChild(rulesResult.rules, childNames));
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

  return { rules, summaries, loading, error, refresh };
}
