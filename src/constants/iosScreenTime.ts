export const IOS_APP_GROUP = 'group.org.reactjs.native.example.ParentKey';

export const IOS_SCREEN_TIME_SELECTION_IDS = {
  block: 'parentkey-blocked-apps',
  limit: 'parentkey-limited-apps',
} as const;

export const IOS_DEFAULT_DAILY_LIMIT_MINUTES = 60;

export const IOS_LIMIT_MONITOR_PREFIX = 'parentkey-daily-limit';

export const IOS_SHIELD_IDS = {
  block: 'parentkey-block-shield',
  limit: 'parentkey-limit-shield',
} as const;
