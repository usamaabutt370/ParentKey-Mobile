import type { AppCategory } from '../types/installedApp';
import { supabase } from './supabase';

export type ChildDevice = {
  id: string;
  childId: string;
  deviceKey: string;
  platform: 'android' | 'ios';
  deviceLabel: string | null;
  lastSeenAt: string;
};

export type ChildInstalledAppRecord = {
  id: string;
  childId: string;
  deviceId: string;
  packageName: string;
  appName: string;
  isSystemApp: boolean;
  category: AppCategory | null;
  iconBase64: string | null;
  scannedAt: string;
};

export type AppBlockRule = {
  id: string;
  childId: string;
  parentId: string;
  packageName: string;
  appName: string | null;
  ruleType: 'block' | 'limit';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChildBlockSummary = {
  childId: string;
  childName: string;
  rules: AppBlockRule[];
};

type DeviceRow = {
  id: string;
  child_id: string;
  device_key: string;
  platform: 'android' | 'ios';
  device_label: string | null;
  last_seen_at: string;
};

type InstalledAppRow = {
  id: string;
  child_id: string;
  device_id: string;
  package_name: string;
  app_name: string;
  is_system_app: boolean;
  category: string | null;
  icon_base64: string | null;
  scanned_at: string;
};

type BlockRuleRow = {
  id: string;
  child_id: string;
  parent_id: string;
  package_name: string;
  app_name: string | null;
  rule_type: 'block' | 'limit';
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

function mapDeviceRow(row: DeviceRow): ChildDevice {
  return {
    id: row.id,
    childId: row.child_id,
    deviceKey: row.device_key,
    platform: row.platform,
    deviceLabel: row.device_label,
    lastSeenAt: row.last_seen_at,
  };
}

function mapInstalledAppRow(row: InstalledAppRow): ChildInstalledAppRecord {
  return {
    id: row.id,
    childId: row.child_id,
    deviceId: row.device_id,
    packageName: row.package_name,
    appName: row.app_name,
    isSystemApp: row.is_system_app,
    category: (row.category as AppCategory | null) ?? null,
    iconBase64: row.icon_base64,
    scannedAt: row.scanned_at,
  };
}

function mapBlockRuleRow(row: BlockRuleRow): AppBlockRule {
  return {
    id: row.id,
    childId: row.child_id,
    parentId: row.parent_id,
    packageName: row.package_name,
    appName: row.app_name,
    ruleType: row.rule_type,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function registerChildDevice(params: {
  childId: string;
  deviceKey: string;
  platform: 'android' | 'ios';
  deviceLabel?: string;
}): Promise<
  { ok: true; device: ChildDevice } | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from('child_devices')
    .upsert(
      {
        child_id: params.childId,
        device_key: params.deviceKey,
        platform: params.platform,
        device_label: params.deviceLabel ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,device_key' },
    )
    .select('id, child_id, device_key, platform, device_label, last_seen_at')
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, device: mapDeviceRow(data as DeviceRow) };
}

export async function syncChildInstalledApps(params: {
  childId: string;
  deviceId: string;
  apps: Array<{
    packageName: string;
    appName: string;
    isSystemApp: boolean;
    category: AppCategory;
    iconBase64?: string | null;
  }>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const scannedAt = new Date().toISOString();
  const rows = params.apps.map(app => ({
    child_id: params.childId,
    device_id: params.deviceId,
    package_name: app.packageName,
    app_name: app.appName,
    is_system_app: app.isSystemApp,
    category: app.category,
    icon_base64: app.iconBase64 ?? null,
    scanned_at: scannedAt,
  }));

  if (rows.length === 0) {
    return { ok: true };
  }

  const { error } = await supabase
    .from('child_installed_apps')
    .upsert(rows, { onConflict: 'device_id,package_name' });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function fetchChildInstalledApps(
  childId: string,
): Promise<
  | { ok: true; apps: ChildInstalledAppRecord[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from('child_installed_apps')
    .select(
      'id, child_id, device_id, package_name, app_name, is_system_app, category, icon_base64, scanned_at',
    )
    .eq('child_id', childId)
    .order('app_name', { ascending: true });

  if (error) {
    return { ok: false, message: error.message };
  }

  const apps = (data as InstalledAppRow[]).map(mapInstalledAppRow);
  const uniqueByPackage = new Map<string, ChildInstalledAppRecord>();

  for (const app of apps) {
    const existing = uniqueByPackage.get(app.packageName);
    if (!existing || app.scannedAt > existing.scannedAt) {
      uniqueByPackage.set(app.packageName, app);
    }
  }

  return {
    ok: true,
    apps: Array.from(uniqueByPackage.values()).sort((left, right) =>
      left.appName.localeCompare(right.appName),
    ),
  };
}

export async function fetchChildBlockRules(
  childId: string,
): Promise<
  | { ok: true; rules: AppBlockRule[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from('app_block_rules')
    .select(
      'id, child_id, parent_id, package_name, app_name, rule_type, enabled, created_at, updated_at',
    )
    .eq('child_id', childId)
    .eq('rule_type', 'block')
    .eq('enabled', true)
    .order('app_name', { ascending: true });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    rules: (data as BlockRuleRow[]).map(mapBlockRuleRow),
  };
}

export async function saveChildBlockRules(params: {
  parentId: string;
  childId: string;
  apps: Array<{ packageName: string; appName: string }>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: deleteError } = await supabase
    .from('app_block_rules')
    .delete()
    .eq('child_id', params.childId)
    .eq('parent_id', params.parentId)
    .eq('rule_type', 'block');

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  if (params.apps.length === 0) {
    return { ok: true };
  }

  const rows = params.apps.map(app => ({
    child_id: params.childId,
    parent_id: params.parentId,
    package_name: app.packageName,
    app_name: app.appName,
    rule_type: 'block' as const,
    enabled: true,
  }));

  const { error: insertError } = await supabase.from('app_block_rules').insert(rows);

  if (insertError) {
    return { ok: false, message: insertError.message };
  }

  return { ok: true };
}

export async function fetchParentBlockRules(
  parentId: string,
): Promise<
  | { ok: true; rules: AppBlockRule[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from('app_block_rules')
    .select(
      'id, child_id, parent_id, package_name, app_name, rule_type, enabled, created_at, updated_at',
    )
    .eq('parent_id', parentId)
    .eq('rule_type', 'block')
    .eq('enabled', true)
    .order('updated_at', { ascending: false });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    rules: (data as BlockRuleRow[]).map(mapBlockRuleRow),
  };
}

export async function removeChildBlockRule(params: {
  parentId: string;
  childId: string;
  packageName: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from('app_block_rules')
    .delete()
    .eq('parent_id', params.parentId)
    .eq('child_id', params.childId)
    .eq('package_name', params.packageName)
    .eq('rule_type', 'block');

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export function groupBlockRulesByChild(
  rules: AppBlockRule[],
  childNames: Record<string, string>,
): ChildBlockSummary[] {
  const grouped = new Map<string, AppBlockRule[]>();

  for (const rule of rules) {
    const existing = grouped.get(rule.childId) ?? [];
    existing.push(rule);
    grouped.set(rule.childId, existing);
  }

  return Array.from(grouped.entries())
    .map(([childId, childRules]) => ({
      childId,
      childName: childNames[childId] ?? 'Child',
      rules: childRules.sort((left, right) =>
        (left.appName ?? left.packageName).localeCompare(
          right.appName ?? right.packageName,
        ),
      ),
    }))
    .sort((left, right) => left.childName.localeCompare(right.childName));
}
