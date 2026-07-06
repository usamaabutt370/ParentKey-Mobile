import type { AppBlockRule, ChildDevice } from './appRules';
import {
  buildTopAppsForDate,
  formatUsageDuration,
} from './appUsage';
import type { AppUsageDailyRecord } from '../types/appUsage';
import type {
  ActivityAlert,
  ActivityAlertType,
  ChildActivitySummary,
} from '../types/parentActivity';

const HEAVY_USAGE_SECONDS = 45 * 60;
const STALE_SYNC_MS = 24 * 60 * 60 * 1000;
const ONLINE_THRESHOLD_MS = 60 * 60 * 1000;
const RECENT_RULE_MS = 7 * 24 * 60 * 60 * 1000;

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();

  if (diffMs < 60_000) {
    return 'Just now';
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function getWeekDates(endDate = new Date()): string[] {
  const dates: string[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(endDate);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    dates.push(getLocalDateString(date));
  }

  return dates;
}

function getDeviceStatus(
  devices: ChildDevice[],
  childId: string,
): ChildActivitySummary['deviceStatus'] {
  const childDevices = devices.filter(device => device.childId === childId);

  if (childDevices.length === 0) {
    return 'never';
  }

  const latestSeen = childDevices.reduce((latest, device) => {
    return device.lastSeenAt > latest ? device.lastSeenAt : latest;
  }, childDevices[0].lastSeenAt);

  const ageMs = Date.now() - new Date(latestSeen).getTime();
  return ageMs <= ONLINE_THRESHOLD_MS ? 'online' : 'offline';
}

function getLatestSyncTime(
  devices: ChildDevice[],
  usageRecords: AppUsageDailyRecord[],
  childId: string,
): string | null {
  const timestamps: string[] = [];

  for (const device of devices) {
    if (device.childId === childId) {
      timestamps.push(device.lastSeenAt);
    }
  }

  for (const record of usageRecords) {
    if (record.childId === childId) {
      timestamps.push(record.syncedAt);
    }
  }

  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.sort((left, right) => right.localeCompare(left))[0];
}

export function buildChildActivitySummaries(params: {
  childIds: string[];
  childNames: Record<string, string>;
  usageRecords: AppUsageDailyRecord[];
  rules: AppBlockRule[];
  devices: ChildDevice[];
}): ChildActivitySummary[] {
  const today = getLocalDateString();
  const weekDates = new Set(getWeekDates());

  return params.childIds.map(childId => {
    const childRecords = params.usageRecords.filter(
      record => record.childId === childId,
    );
    const childRules = params.rules.filter(rule => rule.childId === childId);

    let todaySeconds = 0;
    let weekSeconds = 0;

    for (const record of childRecords) {
      if (record.usageDate === today) {
        todaySeconds += record.foregroundSeconds;
      }

      if (weekDates.has(record.usageDate)) {
        weekSeconds += record.foregroundSeconds;
      }
    }

    const topApps = buildTopAppsForDate(childRecords, today, 1);
    const topApp = topApps[0] ?? null;

    return {
      childId,
      childName: params.childNames[childId] ?? 'Child',
      todaySeconds,
      todayLabel: formatUsageDuration(todaySeconds),
      weekSeconds,
      weekLabel: formatUsageDuration(weekSeconds),
      topAppName: topApp?.name ?? null,
      topAppTime: topApp?.time ?? null,
      blockedAppsCount: childRules.length,
      lastSyncedAt: getLatestSyncTime(params.devices, params.usageRecords, childId),
      deviceStatus: getDeviceStatus(params.devices, childId),
    };
  });
}

export function buildActivityAlerts(params: {
  childNames: Record<string, string>;
  usageRecords: AppUsageDailyRecord[];
  rules: AppBlockRule[];
  devices: ChildDevice[];
  limit?: number;
}): ActivityAlert[] {
  const today = getLocalDateString();
  const now = Date.now();
  const alerts: ActivityAlert[] = [];

  for (const device of params.devices) {
    const ageMs = now - new Date(device.lastSeenAt).getTime();
    if (ageMs <= STALE_SYNC_MS) {
      continue;
    }

    alerts.push({
      id: `sync-device-${device.id}`,
      childId: device.childId,
      childName: params.childNames[device.childId] ?? 'Child',
      message: 'Device has not synced recently',
      occurredAt: device.lastSeenAt,
      timeAgo: formatTimeAgo(device.lastSeenAt),
      type: 'sync',
    });
  }

  for (const rule of params.rules) {
    const ageMs = now - new Date(rule.updatedAt).getTime();
    if (ageMs > RECENT_RULE_MS) {
      continue;
    }

    const appLabel = rule.appName ?? rule.packageName;
    alerts.push({
      id: `blocked-${rule.id}`,
      childId: rule.childId,
      childName: params.childNames[rule.childId] ?? 'Child',
      message: `${appLabel} is blocked`,
      occurredAt: rule.updatedAt,
      timeAgo: formatTimeAgo(rule.updatedAt),
      type: 'blocked',
    });
  }

  for (const record of params.usageRecords) {
    if (
      record.usageDate !== today ||
      record.foregroundSeconds < HEAVY_USAGE_SECONDS
    ) {
      continue;
    }

    alerts.push({
      id: `usage-${record.childId}-${record.packageName}-${record.usageDate}`,
      childId: record.childId,
      childName: params.childNames[record.childId] ?? 'Child',
      message: `${record.appName} used for ${formatUsageDuration(record.foregroundSeconds)} today`,
      occurredAt: record.syncedAt,
      timeAgo: formatTimeAgo(record.syncedAt),
      type: 'usage',
    });
  }

  return alerts
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    )
    .slice(0, params.limit ?? 10);
}

export function getAlertIconName(
  type: ActivityAlertType,
): 'clock' | 'moon' | 'slash' | 'refresh-cw' {
  switch (type) {
    case 'blocked':
      return 'slash';
    case 'sync':
      return 'refresh-cw';
    case 'usage':
    default:
      return 'clock';
  }
}
