import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  fetchChildInstalledApps,
  fetchParentBlockRules,
  fetchParentChildDevices,
  type AppBlockRule,
} from '../lib/appRules';
import {
  buildTopAppsForDate,
  buildUsagePeriodCards,
  buildUsageReportSummary,
  buildWeeklyUsageTotals,
  fetchParentChildrenHourlyUsage,
  fetchParentChildrenUsage,
  type UsagePeriodFallbackApp,
} from '../lib/appUsage';
import { fetchParentChildren, getChildDisplayName } from '../lib/children';
import {
  buildActivityAlerts,
  buildChildActivitySummaries,
} from '../lib/parentActivity';
import { supabase } from '../lib/supabase';
import type {
  AppUsageDailyRecord,
  AppUsageHourlyRecord,
  UsageDailyTotal,
  UsageReportSummary,
  UsageTopApp,
} from '../types/appUsage';
import type { ChildProfile } from '../types/child';
import type {
  ActivityAlert,
  ChildActivitySummary,
  ParentActivityStats,
} from '../types/parentActivity';

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const EMPTY_SUMMARY: UsageReportSummary = {
  todaySeconds: 0,
  weekSeconds: 0,
  todayLabel: '0m',
  weekLabel: '0m',
};

function buildScopedView(
  records: AppUsageDailyRecord[],
  rules: AppBlockRule[],
  alerts: ActivityAlert[],
  childId: string | null,
): {
  records: AppUsageDailyRecord[];
  rules: AppBlockRule[];
  alerts: ActivityAlert[];
  summary: UsageReportSummary;
  topApps: UsageTopApp[];
  weeklyUsage: UsageDailyTotal[];
  stats: ParentActivityStats;
} {
  if (!childId) {
    return {
      records: [],
      rules: [],
      alerts: [],
      summary: EMPTY_SUMMARY,
      topApps: [],
      weeklyUsage: buildWeeklyUsageTotals([]),
      stats: { activeRulesCount: 0, alertCount: 0 },
    };
  }

  const scopedRecords = records.filter(record => record.childId === childId);
  const scopedRules = rules.filter(rule => rule.childId === childId);
  const scopedAlerts = alerts.filter(alert => alert.childId === childId);

  return {
    records: scopedRecords,
    rules: scopedRules,
    alerts: scopedAlerts,
    summary:
      scopedRecords.length === 0
        ? EMPTY_SUMMARY
        : buildUsageReportSummary(scopedRecords),
    topApps: buildTopAppsForDate(scopedRecords, getLocalDateString()),
    weeklyUsage: buildWeeklyUsageTotals(scopedRecords),
    stats: {
      activeRulesCount: scopedRules.length,
      alertCount: scopedAlerts.length,
    },
  };
}

export function useParentActivityDashboard() {
  const { session } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [records, setRecords] = useState<AppUsageDailyRecord[]>([]);
  const [hourlyRecords, setHourlyRecords] = useState<AppUsageHourlyRecord[]>(
    [],
  );
  const [rules, setRules] = useState<AppBlockRule[]>([]);
  const [summary, setSummary] = useState<UsageReportSummary>(EMPTY_SUMMARY);
  const [stats, setStats] = useState<ParentActivityStats>({
    activeRulesCount: 0,
    alertCount: 0,
  });
  const [topApps, setTopApps] = useState<UsageTopApp[]>([]);
  const [weeklyUsage, setWeeklyUsage] = useState<UsageDailyTotal[]>([]);
  const [childSummaries, setChildSummaries] = useState<ChildActivitySummary[]>(
    [],
  );
  const [alerts, setAlerts] = useState<ActivityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const parentId = session?.user.id;
    const silent = options?.silent === true;

    if (!parentId) {
      setChildren([]);
      setSelectedChildId(null);
      setRecords([]);
      setHourlyRecords([]);
      setRules([]);
      setTopApps([]);
      setWeeklyUsage([]);
      setChildSummaries([]);
      setAlerts([]);
      setSummary(EMPTY_SUMMARY);
      setStats({ activeRulesCount: 0, alertCount: 0 });
      setLoading(false);
      setError(null);
      hasLoadedRef.current = false;
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    const childrenResult = await fetchParentChildren(parentId);

    if (!childrenResult.ok) {
      setError(childrenResult.message);
      setLoading(false);
      hasLoadedRef.current = true;
      return;
    }

    const nextChildren = childrenResult.children;
    const childIds = nextChildren.map(child => child.id);
    const childNames = Object.fromEntries(
      nextChildren.map(child => [child.id, getChildDisplayName(child)]),
    );

    setChildren(nextChildren);
    setSelectedChildId(current => {
      if (current && childIds.includes(current)) {
        return current;
      }
      return childIds[0] ?? null;
    });

    if (childIds.length === 0) {
      setRecords([]);
      setHourlyRecords([]);
      setRules([]);
      setTopApps([]);
      setWeeklyUsage([]);
      setChildSummaries([]);
      setAlerts([]);
      setSummary(EMPTY_SUMMARY);
      setStats({ activeRulesCount: 0, alertCount: 0 });
      setLoading(false);
      hasLoadedRef.current = true;
      return;
    }

    const [rulesResult, usageResult, hourlyResult, devicesResult] =
      await Promise.all([
        fetchParentBlockRules(parentId),
        fetchParentChildrenUsage(childIds, 7),
        fetchParentChildrenHourlyUsage(childIds, 2),
        fetchParentChildDevices(childIds),
      ]);

    if (!rulesResult.ok) {
      setError(rulesResult.message);
      setLoading(false);
      hasLoadedRef.current = true;
      return;
    }

    if (!usageResult.ok) {
      setError(usageResult.message);
      setLoading(false);
      hasLoadedRef.current = true;
      return;
    }

    if (!devicesResult.ok) {
      setError(devicesResult.message);
      setLoading(false);
      hasLoadedRef.current = true;
      return;
    }

    const nextRecords = usageResult.records;
    const nextHourlyRecords = hourlyResult.ok ? hourlyResult.records : [];
    const nextRules = rulesResult.rules;
    const nextSummary = buildUsageReportSummary(nextRecords);
    const today = getLocalDateString();
    const nextAlerts = buildActivityAlerts({
      childNames,
      usageRecords: nextRecords,
      rules: nextRules,
      devices: devicesResult.devices,
    });
    const nextChildSummaries = buildChildActivitySummaries({
      childIds,
      childNames,
      usageRecords: nextRecords,
      rules: nextRules,
      devices: devicesResult.devices,
    });

    setRecords(nextRecords);
    setHourlyRecords(nextHourlyRecords);
    setRules(nextRules);
    setSummary(nextSummary);
    setTopApps(buildTopAppsForDate(nextRecords, today));
    setWeeklyUsage(buildWeeklyUsageTotals(nextRecords));
    setChildSummaries(nextChildSummaries);
    setAlerts(nextAlerts);
    setStats({
      activeRulesCount: nextRules.length,
      alertCount: nextAlerts.length,
    });
    setLoading(false);
    hasLoadedRef.current = true;
  }, [session?.user.id]);

  const childrenIdsKey = useMemo(
    () => children.map(child => child.id).sort().join(','),
    [children],
  );
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      return;
    }
    // Debounce bursty realtime events so the loader is not constant.
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void refreshRef.current({ silent: true });
    }, 800);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh({ silent: hasLoadedRef.current });

      // Backup while Realtime is unavailable or migration 018 is not applied.
      const pollId = setInterval(() => {
        void refreshRef.current({ silent: true });
      }, 30_000);

      return () => {
        clearInterval(pollId);
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };
    }, [refresh]),
  );

  // Live-refresh when a child device uploads usage (even if ParentKey Child UI is closed).
  useEffect(() => {
    if (!childrenIdsKey) {
      return;
    }

    // Several screens mount this hook at once, so the topic must be unique —
    // Supabase reuses channels by name and rejects listeners added after subscribe.
    const channel = supabase.channel(
      `parent-usage-${Math.random().toString(36).slice(2)}`,
    );

    for (const childId of childrenIdsKey.split(',')) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'child_app_usage_daily',
          filter: `child_id=eq.${childId}`,
        },
        () => {
          scheduleRefresh();
        },
      );
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'child_app_usage_hourly',
          filter: `child_id=eq.${childId}`,
        },
        () => {
          scheduleRefresh();
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [childrenIdsKey, scheduleRefresh]);

  const selectedChild = useMemo(
    () => children.find(child => child.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  const [installedFallbackApps, setInstalledFallbackApps] = useState<
    UsagePeriodFallbackApp[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedChildId) {
      setInstalledFallbackApps([]);
      return;
    }

    const loadInstalled = async () => {
      const result = await fetchChildInstalledApps(selectedChildId);
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setInstalledFallbackApps([]);
        return;
      }

      setInstalledFallbackApps(
        result.apps.map(app => ({
          packageName: app.packageName,
          appName: app.appName,
          iconBase64: app.iconBase64,
          isSystemApp: app.isSystemApp,
        })),
      );
    };

    void loadInstalled();

    return () => {
      cancelled = true;
    };
  }, [selectedChildId]);

  const selectedView = useMemo(
    () => buildScopedView(records, rules, alerts, selectedChildId),
    [alerts, records, rules, selectedChildId],
  );

  const selectedHourlyRecords = useMemo(() => {
    if (!selectedChildId) {
      return [];
    }
    return hourlyRecords.filter(record => record.childId === selectedChildId);
  }, [hourlyRecords, selectedChildId]);

  const selectedPeriodCards = useMemo(
    () =>
      buildUsagePeriodCards(
        selectedView.records,
        installedFallbackApps,
        selectedHourlyRecords,
      ),
    [installedFallbackApps, selectedHourlyRecords, selectedView.records],
  );

  const selectedBlockedRules = selectedView.rules;

  const selectedAppIcons = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const app of installedFallbackApps) {
      map.set(app.packageName, app.iconBase64 ?? null);
    }
    return map;
  }, [installedFallbackApps]);

  const patchChildUninstallAllowed = useCallback(
    (childId: string, allowed: boolean) => {
      setChildren(current =>
        current.map(child =>
          child.id === childId
            ? { ...child, uninstallAllowed: allowed }
            : child,
        ),
      );
    },
    [],
  );

  return {
    children,
    selectedChildId,
    selectedChild,
    setSelectedChildId,
    selectedSummary: selectedView.summary,
    selectedStats: selectedView.stats,
    selectedTopApps: selectedView.topApps,
    selectedWeeklyUsage: selectedView.weeklyUsage,
    selectedAlerts: selectedView.alerts,
    selectedBlockedRules,
    selectedAppIcons,
    selectedPeriodCards,
    patchChildUninstallAllowed,
    records,
    rules,
    summary,
    stats,
    topApps,
    weeklyUsage,
    childSummaries,
    alerts,
    loading,
    error,
    refresh,
  };
}
