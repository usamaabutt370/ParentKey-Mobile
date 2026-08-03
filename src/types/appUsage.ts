export type AppUsageDailyRecord = {
  id: string;
  childId: string;
  deviceId: string;
  packageName: string;
  appName: string;
  usageDate: string;
  foregroundSeconds: number;
  syncedAt: string;
};

export type UsageReportSummary = {
  todaySeconds: number;
  weekSeconds: number;
  todayLabel: string;
  weekLabel: string;
};

export type UsageTopApp = {
  name: string;
  packageName: string;
  time: string;
  percentage: number;
  foregroundSeconds: number;
  iconBase64?: string | null;
};

export type UsageDailyTotal = {
  day: string;
  hours: number;
  label: string;
  usageDate: string;
};

export type UsagePeriodId = 'today' | 'yesterday' | 'week';

export type UsagePeriodChartBar = {
  key: string;
  label: string;
  seconds: number;
  display: string;
};

export type UsagePeriodCard = {
  id: UsagePeriodId;
  title: string;
  totalSeconds: number;
  totalLabel: string;
  apps: UsageTopApp[];
  moreAppsCount: number;
  chartBars: UsagePeriodChartBar[];
  emptyMessage: string;
};
