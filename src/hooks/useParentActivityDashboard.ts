import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  fetchParentBlockRules,
  fetchParentChildDevices,
} from '../lib/appRules';
import {
  buildTopAppsForDate,
  buildUsageReportSummary,
  buildWeeklyUsageTotals,
  fetchParentChildrenUsage,
} from '../lib/appUsage';
import { fetchParentChildren, getChildDisplayName } from '../lib/children';
import {
  buildActivityAlerts,
  buildChildActivitySummaries,
} from '../lib/parentActivity';
import type {
  AppUsageDailyRecord,
  UsageDailyTotal,
  UsageReportSummary,
  UsageTopApp,
} from '../types/appUsage';
import type {
  ActivityAlert,
  ChildActivitySummary,
  ParentActivityStats,
} from '../types/parentActivity';
import type { AppBlockRule } from '../lib/appRules';

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useParentActivityDashboard() {
  const { session } = useAuth();
  const [records, setRecords] = useState<AppUsageDailyRecord[]>([]);
  const [rules, setRules] = useState<AppBlockRule[]>([]);
  const [summary, setSummary] = useState<UsageReportSummary>({
    todaySeconds: 0,
    weekSeconds: 0,
    todayLabel: '0m',
    weekLabel: '0m',
  });
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

  const refresh = useCallback(async () => {
    const parentId = session?.user.id;

    if (!parentId) {
      setRecords([]);
      setRules([]);
      setTopApps([]);
      setWeeklyUsage([]);
      setChildSummaries([]);
      setAlerts([]);
      setSummary({
        todaySeconds: 0,
        weekSeconds: 0,
        todayLabel: '0m',
        weekLabel: '0m',
      });
      setStats({ activeRulesCount: 0, alertCount: 0 });
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const childrenResult = await fetchParentChildren(parentId);

    if (!childrenResult.ok) {
      setError(childrenResult.message);
      setLoading(false);
      return;
    }

    const childIds = childrenResult.children.map(child => child.id);
    const childNames = Object.fromEntries(
      childrenResult.children.map(child => [
        child.id,
        getChildDisplayName(child),
      ]),
    );

    if (childIds.length === 0) {
      setRecords([]);
      setRules([]);
      setTopApps([]);
      setWeeklyUsage([]);
      setChildSummaries([]);
      setAlerts([]);
      setSummary({
        todaySeconds: 0,
        weekSeconds: 0,
        todayLabel: '0m',
        weekLabel: '0m',
      });
      setStats({ activeRulesCount: 0, alertCount: 0 });
      setLoading(false);
      return;
    }

    const [rulesResult, usageResult, devicesResult] = await Promise.all([
      fetchParentBlockRules(parentId),
      fetchParentChildrenUsage(childIds, 7),
      fetchParentChildDevices(childIds),
    ]);

    if (!rulesResult.ok) {
      setError(rulesResult.message);
      setLoading(false);
      return;
    }

    if (!usageResult.ok) {
      setError(usageResult.message);
      setLoading(false);
      return;
    }

    if (!devicesResult.ok) {
      setError(devicesResult.message);
      setLoading(false);
      return;
    }

    const nextRecords = usageResult.records;
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
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
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
