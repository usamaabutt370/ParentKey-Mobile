import type {
  AppUsageDailyRecord,
  UsageDailyTotal,
  UsageReportSummary,
  UsageTopApp,
} from '../types/appUsage';
import { fetchParentChildDevices } from './appRules';
import { supabase } from './supabase';

type UsageRow = {
  id: string;
  child_id: string;
  device_id: string;
  package_name: string;
  app_name: string;
  usage_date: string;
  foreground_seconds: number;
  synced_at: string;
};

function mapUsageRow(row: UsageRow): AppUsageDailyRecord {
  return {
    id: row.id,
    childId: row.child_id,
    deviceId: row.device_id,
    packageName: row.package_name,
    appName: row.app_name,
    usageDate: row.usage_date,
    foregroundSeconds: row.foreground_seconds,
    syncedAt: row.synced_at,
  };
}

const EXCLUDED_USAGE_PACKAGE_PATTERNS = [
  'launcher',
  'systemui',
  'com.android.settings',
  'com.google.android.settings',
  'com.android.permissioncontroller',
];

export function isExcludedUsagePackage(packageName: string): boolean {
  const lowered = packageName.toLowerCase();

  return EXCLUDED_USAGE_PACKAGE_PATTERNS.some(pattern =>
    lowered.includes(pattern),
  );
}

export function filterUsageRecords<T extends { packageName: string }>(
  records: T[],
): T[] {
  return records.filter(record => !isExcludedUsagePackage(record.packageName));
}

export function formatUsageDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return '0m';
  }

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return '0m';
}

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayLabel(usageDate: string): string {
  const [year, month, day] = usageDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return DAY_LABELS[date.getDay()] ?? usageDate;
}

function capUsageSecondsForDate(
  usageDate: string,
  foregroundSeconds: number,
  trackingStartedAt?: string | null,
): number {
  const today = getLocalDateString();
  let capped = foregroundSeconds;

  if (trackingStartedAt) {
    const trackingStartDate = getLocalDateString(new Date(trackingStartedAt));

    if (usageDate < trackingStartDate) {
      return 0;
    }

    if (usageDate === trackingStartDate && usageDate === today) {
      const trackingStartMs = new Date(trackingStartedAt).getTime();
      const maxSinceTracking = Math.floor((Date.now() - trackingStartMs) / 1000);
      capped = Math.min(capped, Math.max(0, maxSinceTracking));
    }
  }

  if (usageDate === today) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const maxSeconds = Math.floor((Date.now() - startOfDay.getTime()) / 1000);
    capped = Math.min(capped, Math.max(0, maxSeconds));
  }

  return capped;
}

function normalizeUsageRecords(
  records: AppUsageDailyRecord[],
  trackingByDevice: Map<string, string | null>,
): AppUsageDailyRecord[] {
  return records.flatMap(record => {
    const trackingStartedAt = trackingByDevice.get(record.deviceId);

    if (!trackingStartedAt) {
      return [];
    }

    const foregroundSeconds = capUsageSecondsForDate(
      record.usageDate,
      record.foregroundSeconds,
      trackingStartedAt,
    );

    if (foregroundSeconds <= 0) {
      return [];
    }

    return [{ ...record, foregroundSeconds }];
  });
}

export async function syncChildAppUsage(params: {
  childId: string;
  deviceId: string;
  isFirstUsageSync: boolean;
  trackingStartedAt: string | null;
  records: Array<{
    packageName: string;
    appName: string;
    usageDate: string;
    foregroundSeconds: number;
  }>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const syncedAt = new Date().toISOString();
  const today = getLocalDateString();
  const trackingAnchor = params.isFirstUsageSync
    ? syncedAt
    : params.trackingStartedAt;

  if (params.isFirstUsageSync) {
    const { error: wipeError } = await supabase
      .from('child_app_usage_daily')
      .delete()
      .eq('device_id', params.deviceId);

    if (wipeError) {
      return { ok: false, message: wipeError.message };
    }

    const { error: markError } = await supabase
      .from('child_devices')
      .update({ usage_tracking_started_at: syncedAt })
      .eq('id', params.deviceId);

    if (markError) {
      return { ok: false, message: markError.message };
    }
  } else {
    const { error: deleteTodayError } = await supabase
      .from('child_app_usage_daily')
      .delete()
      .eq('device_id', params.deviceId)
      .eq('usage_date', today);

    if (deleteTodayError) {
      return { ok: false, message: deleteTodayError.message };
    }
  }

  const validRecords = filterUsageRecords(params.records)
    .filter(record => record.usageDate === today && record.foregroundSeconds > 0)
    .map(record => ({
      ...record,
      foregroundSeconds: capUsageSecondsForDate(
        record.usageDate,
        record.foregroundSeconds,
        trackingAnchor,
      ),
    }))
    .filter(record => record.foregroundSeconds > 0);

  if (validRecords.length === 0) {
    return { ok: true };
  }

  const rows = validRecords.map(record => ({
    child_id: params.childId,
    device_id: params.deviceId,
    package_name: record.packageName,
    app_name: record.appName,
    usage_date: record.usageDate,
    foreground_seconds: record.foregroundSeconds,
    synced_at: syncedAt,
  }));

  const { error } = await supabase.from('child_app_usage_daily').insert(rows);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function fetchChildAppUsage(
  childId: string,
  daysBack = 7,
): Promise<
  | { ok: true; records: AppUsageDailyRecord[] }
  | { ok: false; message: string }
> {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (daysBack - 1));
  const startDateString = getLocalDateString(startDate);

  const { data, error } = await supabase
    .from('child_app_usage_daily')
    .select(
      'id, child_id, device_id, package_name, app_name, usage_date, foreground_seconds, synced_at',
    )
    .eq('child_id', childId)
    .gte('usage_date', startDateString)
    .order('usage_date', { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const records = filterUsageRecords((data as UsageRow[]).map(mapUsageRow));
  const devicesResult = await fetchParentChildDevices([childId]);
  const trackingByDevice = new Map(
    devicesResult.ok
      ? devicesResult.devices.map(device => [
          device.id,
          device.usageTrackingStartedAt,
        ])
      : [],
  );
  const normalizedRecords = normalizeUsageRecords(records, trackingByDevice);
  const uniqueByKey = new Map<string, AppUsageDailyRecord>();

  for (const record of normalizedRecords) {
    const key = `${record.usageDate}:${record.packageName}`;
    const existing = uniqueByKey.get(key);

    if (!existing || record.foregroundSeconds > existing.foregroundSeconds) {
      uniqueByKey.set(key, record);
    }
  }

  return {
    ok: true,
    records: Array.from(uniqueByKey.values()),
  };
}

export async function fetchParentChildrenUsage(
  childIds: string[],
  daysBack = 7,
): Promise<
  | { ok: true; records: AppUsageDailyRecord[] }
  | { ok: false; message: string }
> {
  if (childIds.length === 0) {
    return { ok: true, records: [] };
  }

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (daysBack - 1));
  const startDateString = getLocalDateString(startDate);

  const { data, error } = await supabase
    .from('child_app_usage_daily')
    .select(
      'id, child_id, device_id, package_name, app_name, usage_date, foreground_seconds, synced_at',
    )
    .in('child_id', childIds)
    .gte('usage_date', startDateString)
    .order('usage_date', { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  const records = filterUsageRecords((data as UsageRow[]).map(mapUsageRow));
  const devicesResult = await fetchParentChildDevices(childIds);
  const trackingByDevice = new Map(
    devicesResult.ok
      ? devicesResult.devices.map(device => [
          device.id,
          device.usageTrackingStartedAt,
        ])
      : [],
  );
  const normalizedRecords = normalizeUsageRecords(records, trackingByDevice);
  const aggregated = new Map<string, AppUsageDailyRecord>();

  for (const record of normalizedRecords) {
    const key = `${record.childId}:${record.usageDate}:${record.packageName}`;
    const existing = aggregated.get(key);

    if (!existing) {
      aggregated.set(key, record);
      continue;
    }

    aggregated.set(key, {
      ...existing,
      foregroundSeconds: existing.foregroundSeconds + record.foregroundSeconds,
      syncedAt:
        record.syncedAt > existing.syncedAt ? record.syncedAt : existing.syncedAt,
    });
  }

  return {
    ok: true,
    records: Array.from(aggregated.values()),
  };
}

export function buildUsageReportSummary(
  records: AppUsageDailyRecord[],
): UsageReportSummary {
  const today = getLocalDateString();
  const weekDates = new Set(getWeekDates());
  const filteredRecords = filterUsageRecords(records);

  let todaySeconds = 0;
  let weekSeconds = 0;

  for (const record of filteredRecords) {
    const seconds = record.foregroundSeconds;

    if (record.usageDate === today) {
      todaySeconds += seconds;
    }

    if (weekDates.has(record.usageDate)) {
      weekSeconds += seconds;
    }
  }

  return {
    todaySeconds,
    weekSeconds,
    todayLabel: formatUsageDuration(todaySeconds),
    weekLabel: formatUsageDuration(weekSeconds),
  };
}

export function buildTopAppsForDate(
  records: AppUsageDailyRecord[],
  usageDate: string,
  limit = 5,
): UsageTopApp[] {
  const filteredRecords = filterUsageRecords(records);
  const totalsByPackage = new Map<
    string,
    { appName: string; foregroundSeconds: number }
  >();

  for (const record of filteredRecords) {
    if (record.usageDate !== usageDate) {
      continue;
    }

    const seconds = record.foregroundSeconds;

    if (seconds <= 0) {
      continue;
    }

    const existing = totalsByPackage.get(record.packageName);
    if (existing) {
      existing.foregroundSeconds += seconds;
      continue;
    }

    totalsByPackage.set(record.packageName, {
      appName: record.appName,
      foregroundSeconds: seconds,
    });
  }

  const sorted = Array.from(totalsByPackage.entries()).sort(
    (left, right) => right[1].foregroundSeconds - left[1].foregroundSeconds,
  );

  const top = sorted.slice(0, limit);
  const maxSeconds = top[0]?.[1].foregroundSeconds ?? 0;

  return top.map(([packageName, value]) => ({
    packageName,
    name: value.appName,
    foregroundSeconds: value.foregroundSeconds,
    time: formatUsageDuration(value.foregroundSeconds),
    percentage:
      maxSeconds > 0
        ? Math.round((value.foregroundSeconds / maxSeconds) * 100)
        : 0,
  }));
}

export function buildWeeklyUsageTotals(
  records: AppUsageDailyRecord[],
): UsageDailyTotal[] {
  const filteredRecords = filterUsageRecords(records);
  const weekDates = getWeekDates();
  const totalsByDate = new Map<string, number>();

  for (const usageDate of weekDates) {
    totalsByDate.set(usageDate, 0);
  }

  for (const record of filteredRecords) {
    if (!totalsByDate.has(record.usageDate)) {
      continue;
    }

    const seconds = record.foregroundSeconds;

    totalsByDate.set(
      record.usageDate,
      (totalsByDate.get(record.usageDate) ?? 0) + seconds,
    );
  }

  return weekDates.map(usageDate => {
    const totalSeconds = totalsByDate.get(usageDate) ?? 0;
    const hours = totalSeconds / 3600;

    return {
      usageDate,
      day: getDayLabel(usageDate),
      hours,
      label: formatUsageDuration(totalSeconds),
    };
  });
}
