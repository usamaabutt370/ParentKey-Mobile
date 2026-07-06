export type ActivityAlertType = 'blocked' | 'usage' | 'sync';

export type ActivityAlert = {
  id: string;
  childId: string;
  childName: string;
  message: string;
  occurredAt: string;
  timeAgo: string;
  type: ActivityAlertType;
};

export type ChildActivitySummary = {
  childId: string;
  childName: string;
  todaySeconds: number;
  todayLabel: string;
  weekSeconds: number;
  weekLabel: string;
  topAppName: string | null;
  topAppTime: string | null;
  blockedAppsCount: number;
  lastSyncedAt: string | null;
  deviceStatus: 'online' | 'offline' | 'never';
};

export type ParentActivityStats = {
  activeRulesCount: number;
  alertCount: number;
};
