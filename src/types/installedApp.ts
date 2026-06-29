export type AppCategory =
  | 'social'
  | 'entertainment'
  | 'games'
  | 'communication'
  | 'browser'
  | 'other';

export type InstalledApp = {
  id: string;
  name: string;
  packageName: string;
  isSystemApp: boolean;
  category: AppCategory;
};

export type InstalledAppsResult = {
  apps: InstalledApp[];
  platform: 'android' | 'ios';
  iosRequiresFamilyPicker: boolean;
};

export type AppCategoryFilter = 'all' | AppCategory;
