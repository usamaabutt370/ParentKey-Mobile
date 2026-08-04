import type {
  AppUsageDailyRecord,
  AppUsageHourlyRecord,
  UsageDailyTotal,
  UsagePeriodCard,
  UsagePeriodChartBar,
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

type HourlyUsageRow = UsageRow & {
  hour: number;
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

function mapHourlyUsageRow(row: HourlyUsageRow): AppUsageHourlyRecord {
  return {
    id: row.id,
    childId: row.child_id,
    deviceId: row.device_id,
    packageName: row.package_name,
    appName: row.app_name,
    usageDate: row.usage_date,
    hour: row.hour,
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

/** Longer label for period cards, e.g. "2 h 15 min". */
export function formatUsageDurationLong(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return '0 min';
  }

  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  return `${minutes} min`;
}

/** Compact scale label, e.g. "45m", "2h", "2.5h". */
export function formatUsageAxisLabel(totalSeconds: number): string {
  if (totalSeconds < 3600) {
    return `${Math.max(1, Math.round(totalSeconds / 60))}m`;
  }

  const hours = totalSeconds / 3600;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

const USAGE_AXIS_STEPS_SECONDS = [
  5 * 60,
  10 * 60,
  15 * 60,
  30 * 60,
  45 * 60,
  60 * 60,
  90 * 60,
  2 * 3600,
  3 * 3600,
  4 * 3600,
  6 * 3600,
  8 * 3600,
  12 * 3600,
  18 * 3600,
  24 * 3600,
];

/**
 * Rounded ceiling for usage charts. Always leaves headroom above the busiest bar so a
 * full track never reads as "the limit", and so heavier use has somewhere to grow.
 */
export function getUsageAxisMaxSeconds(topSeconds: number): number {
  if (topSeconds <= 0) {
    return USAGE_AXIS_STEPS_SECONDS[0];
  }

  const withHeadroom = topSeconds * 1.15;
  const step = USAGE_AXIS_STEPS_SECONDS.find(value => value >= withHeadroom);

  return step ?? Math.ceil(withHeadroom / 3600) * 3600;
}

export function getLocalDateOffset(daysBack = 0): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysBack);
  return getLocalDateString(date);
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
    // Prefer the device flag, but never drop rows just because it is missing —
    // native uploads can land before that column is set/refetched.
    const trackingStartedAt =
      trackingByDevice.get(record.deviceId) ?? record.syncedAt ?? null;

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

  // Native background sync writes the same rows, so replace by key rather than
  // delete-then-insert, which raced with it and hit the unique constraint.
  const { error } = await supabase
    .from('child_app_usage_daily')
    .upsert(rows, { onConflict: 'device_id,package_name,usage_date' });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function syncChildAppUsageHourly(params: {
  childId: string;
  deviceId: string;
  records: Array<{
    packageName: string;
    appName: string;
    usageDate: string;
    hour: number;
    foregroundSeconds: number;
  }>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const syncedAt = new Date().toISOString();
  const today = getLocalDateString();
  const validRecords = filterUsageRecords(params.records)
    .filter(
      record =>
        record.usageDate === today &&
        record.foregroundSeconds > 0 &&
        record.hour >= 0 &&
        record.hour <= 23,
    );

  if (validRecords.length === 0) {
    return { ok: true };
  }

  const rows = validRecords.map(record => ({
    child_id: params.childId,
    device_id: params.deviceId,
    package_name: record.packageName,
    app_name: record.appName,
    usage_date: record.usageDate,
    hour: record.hour,
    foreground_seconds: record.foregroundSeconds,
    synced_at: syncedAt,
  }));

  const { error } = await supabase
    .from('child_app_usage_hourly')
    .upsert(rows, {
      onConflict: 'device_id,package_name,usage_date,hour',
    });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function fetchParentChildrenHourlyUsage(
  childIds: string[],
  daysBack = 2,
): Promise<
  | { ok: true; records: AppUsageHourlyRecord[] }
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
    .from('child_app_usage_hourly')
    .select(
      'id, child_id, device_id, package_name, app_name, usage_date, hour, foreground_seconds, synced_at',
    )
    .in('child_id', childIds)
    .gte('usage_date', startDateString)
    .order('usage_date', { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    records: filterUsageRecords(
      (data as HourlyUsageRow[]).map(mapHourlyUsageRow),
    ),
  };
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
  return buildTopAppsForDates(records, [usageDate], limit);
}

export function buildTopAppsForDates(
  records: AppUsageDailyRecord[],
  usageDates: string[],
  limit = 5,
): UsageTopApp[] {
  const dateSet = new Set(usageDates);
  const filteredRecords = filterUsageRecords(records);
  const totalsByPackage = new Map<
    string,
    { appName: string; foregroundSeconds: number }
  >();

  for (const record of filteredRecords) {
    if (!dateSet.has(record.usageDate)) {
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
  // Measure against a rounded ceiling rather than the busiest app, so the leading bar
  // keeps headroom instead of reading as a maxed-out limit.
  const axisMaxSeconds = getUsageAxisMaxSeconds(top[0]?.[1].foregroundSeconds ?? 0);

  return top.map(([packageName, value]) => ({
    packageName,
    name: value.appName,
    foregroundSeconds: value.foregroundSeconds,
    time: formatUsageDurationLong(value.foregroundSeconds),
    percentage: Math.min(
      100,
      Math.round((value.foregroundSeconds / axisMaxSeconds) * 100),
    ),
  }));
}

function sumSecondsForDates(
  records: AppUsageDailyRecord[],
  usageDates: string[],
): number {
  const dateSet = new Set(usageDates);
  let total = 0;

  for (const record of filterUsageRecords(records)) {
    if (!dateSet.has(record.usageDate)) {
      continue;
    }
    total += record.foregroundSeconds;
  }

  return total;
}

function formatHourSlotLabel(hour: number): string {
  if (hour === 0) {
    return '0:00 AM';
  }
  const suffix = hour < 12 ? 'AM' : 'PM';
  const display = hour === 12 ? 12 : hour % 12;
  return `${display}:00 ${suffix}`;
}

export function formatUsageAxisTick(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return '0';
  }
  if (totalSeconds < 3600) {
    return `${Math.max(1, Math.round(totalSeconds / 60))} min`;
  }
  const hours = totalSeconds / 3600;
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`;
}

/** Build 24 hourly bars (0–23). Optionally filter to one package. */
export function buildHourlyChartBars(
  records: AppUsageHourlyRecord[],
  packageName?: string | null,
): UsagePeriodChartBar[] {
  const filtered = packageName
    ? records.filter(record => record.packageName === packageName)
    : records;
  const secondsByHour = new Map<number, number>();

  for (let hour = 0; hour < 24; hour += 1) {
    secondsByHour.set(hour, 0);
  }

  for (const record of filtered) {
    if (record.hour < 0 || record.hour > 23) {
      continue;
    }
    secondsByHour.set(
      record.hour,
      (secondsByHour.get(record.hour) ?? 0) + record.foregroundSeconds,
    );
  }

  return Array.from({ length: 24 }, (_, hour) => {
    const seconds = secondsByHour.get(hour) ?? 0;
    const showLabel = hour === 0 || hour === 6 || hour === 12 || hour === 18;
    return {
      key: `hour-${hour}`,
      label: showLabel ? formatHourSlotLabel(hour) : '',
      seconds,
      display: formatUsageDuration(seconds),
      hour,
    };
  });
}

const PERIOD_CARD_PREVIEW_LIMIT = 3;
/** High enough that "more apps" can reveal the full synced set. */
const PERIOD_CARD_APP_LIMIT = 200;

export type UsagePeriodFallbackApp = {
  packageName: string;
  appName: string;
  iconBase64?: string | null;
  isSystemApp?: boolean;
};

function mergeUsageWithInstalledApps(
  usageApps: UsageTopApp[],
  installed: UsagePeriodFallbackApp[],
  limit: number,
): UsageTopApp[] {
  const iconByPackage = new Map(
    installed.map(app => [app.packageName, app.iconBase64 ?? null]),
  );
  const merged = new Map<string, UsageTopApp>();

  for (const app of usageApps) {
    merged.set(app.packageName, {
      ...app,
      hasTracking: app.foregroundSeconds > 0,
      iconBase64: iconByPackage.get(app.packageName) ?? app.iconBase64 ?? null,
    });
  }

  const preferredInstalled = [
    ...installed.filter(app => !app.isSystemApp),
    ...installed.filter(app => app.isSystemApp),
  ];

  for (const app of preferredInstalled) {
    if (merged.has(app.packageName)) {
      continue;
    }
    if (isExcludedUsagePackage(app.packageName)) {
      continue;
    }

    merged.set(app.packageName, {
      packageName: app.packageName,
      name: app.appName,
      time: formatUsageDurationLong(0),
      percentage: 0,
      foregroundSeconds: 0,
      hasTracking: false,
      iconBase64: app.iconBase64 ?? null,
    });
  }

  return Array.from(merged.values())
    .sort((left, right) => {
      if (right.foregroundSeconds !== left.foregroundSeconds) {
        return right.foregroundSeconds - left.foregroundSeconds;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

function buildDayPeriodCard(params: {
  id: 'today' | 'yesterday';
  title: string;
  usageDate: string;
  records: AppUsageDailyRecord[];
  hourlyRecords: AppUsageHourlyRecord[];
  installedApps: UsagePeriodFallbackApp[];
  emptyMessage: string;
}): UsagePeriodCard {
  const usageApps = buildTopAppsForDates(
    params.records,
    [params.usageDate],
    PERIOD_CARD_APP_LIMIT,
  ).map(app => ({ ...app, hasTracking: true }));
  const apps = mergeUsageWithInstalledApps(
    usageApps,
    params.installedApps,
    PERIOD_CARD_APP_LIMIT,
  );
  const totalSeconds = sumSecondsForDates(params.records, [params.usageDate]);
  const dayHourly = params.hourlyRecords.filter(
    record => record.usageDate === params.usageDate,
  );

  return {
    id: params.id,
    title: params.title,
    totalSeconds,
    totalLabel: formatUsageDurationLong(totalSeconds),
    apps,
    moreAppsCount: Math.max(0, apps.length - PERIOD_CARD_PREVIEW_LIMIT),
    chartBars: buildHourlyChartBars(dayHourly),
    hourlyRecords: dayHourly,
    chartMode: 'hourly',
    emptyMessage: params.emptyMessage,
  };
}

export function buildUsagePeriodCards(
  records: AppUsageDailyRecord[],
  installedApps: UsagePeriodFallbackApp[] = [],
  hourlyRecords: AppUsageHourlyRecord[] = [],
): UsagePeriodCard[] {
  const today = getLocalDateOffset(0);
  const yesterday = getLocalDateOffset(1);
  const weekDates = getWeekDates();
  const weekUsageApps = buildTopAppsForDates(
    records,
    weekDates,
    PERIOD_CARD_APP_LIMIT,
  ).map(app => ({ ...app, hasTracking: true }));
  const weekApps = mergeUsageWithInstalledApps(
    weekUsageApps,
    installedApps,
    PERIOD_CARD_APP_LIMIT,
  );
  const weekSeconds = sumSecondsForDates(records, weekDates);
  const weeklyTotals = buildWeeklyUsageTotals(records);

  const weekCard: UsagePeriodCard = {
    id: 'week',
    title: 'This week on the phone',
    totalSeconds: weekSeconds,
    totalLabel: formatUsageDurationLong(weekSeconds),
    apps: weekApps,
    moreAppsCount: Math.max(0, weekApps.length - PERIOD_CARD_PREVIEW_LIMIT),
    chartBars: weeklyTotals.map(day => ({
      key: day.usageDate,
      label: day.day,
      seconds: Math.round(day.hours * 3600),
      display: day.label,
    })),
    hourlyRecords: [],
    chartMode: 'daily',
    emptyMessage: 'No weekly usage synced yet.',
  };

  return [
    buildDayPeriodCard({
      id: 'today',
      title: 'Today on the phone',
      usageDate: today,
      records,
      hourlyRecords,
      installedApps,
      emptyMessage: 'No usage recorded for today yet.',
    }),
    buildDayPeriodCard({
      id: 'yesterday',
      title: 'Yesterday on the phone',
      usageDate: yesterday,
      records,
      hourlyRecords,
      installedApps,
      emptyMessage: 'No usage recorded for yesterday.',
    }),
    weekCard,
  ];
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
