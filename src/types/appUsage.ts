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
};

export type UsageDailyTotal = {
  day: string;
  hours: number;
  label: string;
  usageDate: string;
};
