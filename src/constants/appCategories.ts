import type { AppCategory } from '../types/installedApp';

type CategoryRule = {
  category: AppCategory;
  prefixes: string[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'social',
    prefixes: [
      'com.facebook.',
      'com.instagram.',
      'com.zhiliaoapp.',
      'com.ss.android.ugc.',
      'com.snapchat.',
      'com.twitter.',
      'com.reddit.',
      'com.linkedin.',
      'com.pinterest.',
      'com.tumblr.',
      'com.bereal.',
      'com.clubhouse.',
      'com.vsco.',
    ],
  },
  {
    category: 'entertainment',
    prefixes: [
      'com.google.android.youtube',
      'com.netflix.',
      'com.spotify.',
      'com.amazon.avod.',
      'tv.twitch.',
      'com.disney.',
      'com.hulu.',
      'com.crunchyroll.',
    ],
  },
  {
    category: 'communication',
    prefixes: [
      'com.whatsapp',
      'org.telegram.',
      'com.discord',
      'com.Slack',
      'com.microsoft.teams',
      'us.zoom.',
      'com.skype.',
      'com.facebook.orca',
      'com.facebook.mlite',
    ],
  },
  {
    category: 'games',
    prefixes: [
      'com.supercell.',
      'com.mojang.',
      'com.roblox.',
      'com.epicgames.',
      'com.activision.',
      'com.ea.game.',
      'com.king.',
    ],
  },
  {
    category: 'browser',
    prefixes: [
      'com.android.chrome',
      'org.mozilla.firefox',
      'com.brave.browser',
      'com.opera.browser',
      'com.microsoft.emmx',
      'com.sec.android.app.sbrowser',
    ],
  },
];

const SOCIAL_NAME_KEYWORDS = [
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'snapchat',
  'twitter',
  'whatsapp',
  'telegram',
  'discord',
  'reddit',
  'pinterest',
  'linkedin',
];

export function detectAppCategory(
  packageName: string,
  appName: string,
): AppCategory {
  const normalizedPackage = packageName.toLowerCase();
  const normalizedName = appName.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (
      rule.prefixes.some(prefix =>
        normalizedPackage.startsWith(prefix.toLowerCase()),
      )
    ) {
      return rule.category;
    }
  }

  if (SOCIAL_NAME_KEYWORDS.some(keyword => normalizedName.includes(keyword))) {
    return 'social';
  }

  return 'other';
}

export const APP_CATEGORY_LABELS: Record<AppCategory, string> = {
  social: 'Social',
  entertainment: 'Entertainment',
  games: 'Games',
  communication: 'Communication',
  browser: 'Browser',
  other: 'Other',
};

export const APP_CATEGORY_FILTERS: Array<{
  id: 'all' | AppCategory;
  label: string;
}> = [
  { id: 'all', label: 'All apps' },
  { id: 'social', label: 'Social' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'games', label: 'Games' },
  { id: 'communication', label: 'Chat' },
  { id: 'browser', label: 'Browser' },
  { id: 'other', label: 'Other' },
];
