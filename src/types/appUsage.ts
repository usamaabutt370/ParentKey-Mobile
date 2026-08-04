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

export type AppUsageHourlyRecord = {
  id: string;
  childId: string;
  deviceId: string;
  packageName: string;
  appName: string;
  usageDate: string;
  hour: number;
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
  /** True when this app has real tracked usage (not just inventory filler). */
  hasTracking?: boolean;
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
  /** 0–23 for hourly charts; omitted for weekly day bars. */
  hour?: number;
};

export type UsagePeriodCard = {
  id: UsagePeriodId;
  title: string;
  totalSeconds: number;
  totalLabel: string;
  apps: UsageTopApp[];
  moreAppsCount: number;
  chartBars: UsagePeriodChartBar[];
  /** Hourly buckets for today/yesterday; empty for week card. */
  hourlyRecords: AppUsageHourlyRecord[];
  chartMode: 'hourly' | 'daily';
  emptyMessage: string;
};
