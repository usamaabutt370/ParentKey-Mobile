import type { InstalledApp } from '../types/installedApp';

type ChildAppInventoryCache = {
  childId: string;
  installedApps: InstalledApp[];
  blockedPackages: string[];
  blockedCount: number;
  lastSyncedAt: string;
  deviceId: string | null;
  usageTrackingStartedAt: string | null;
};

const RECENT_SYNC_MS = 10 * 60 * 1000;

let cache: ChildAppInventoryCache | null = null;

export function saveChildAppInventoryCache(
  next: ChildAppInventoryCache,
): void {
  cache = next;
}

export function getChildAppInventoryCache(
  childId: string,
): ChildAppInventoryCache | null {
  if (!cache || cache.childId !== childId) {
    return null;
  }

  return cache;
}

export function hasRecentChildAppInventorySync(childId: string): boolean {
  const current = getChildAppInventoryCache(childId);
  if (!current) {
    return false;
  }

  const syncedAt = new Date(current.lastSyncedAt).getTime();
  if (Number.isNaN(syncedAt)) {
    return false;
  }

  return Date.now() - syncedAt < RECENT_SYNC_MS;
}

export function clearChildAppInventoryCache(childId?: string): void {
  if (!childId || cache?.childId === childId) {
    cache = null;
  }
}
