import { useParentActivityDashboard } from './useParentActivityDashboard';

export function useParentUsageReports() {
  const dashboard = useParentActivityDashboard();

  return {
    records: dashboard.records,
    summary: dashboard.summary,
    topApps: dashboard.topApps,
    weeklyUsage: dashboard.weeklyUsage,
    loading: dashboard.loading,
    error: dashboard.error,
    refresh: dashboard.refresh,
  };
}
