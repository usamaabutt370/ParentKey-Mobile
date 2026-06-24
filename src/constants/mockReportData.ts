export type MockTopApp = {
  name: string;
  time: string;
  percentage: number;
};

export type MockDailyUsage = {
  day: string;
  hours: number;
  label: string;
};

export type MockAlert = {
  id: string;
  childName: string;
  message: string;
  timeAgo: string;
  type: 'limit' | 'bedtime' | 'blocked';
};

export const MOCK_TOP_APPS: MockTopApp[] = [
  { name: 'YouTube', time: '1h 20m', percentage: 44 },
  { name: 'Minecraft', time: '45m', percentage: 25 },
  { name: 'Messages', time: '30m', percentage: 17 },
  { name: 'Safari', time: '25m', percentage: 14 },
];

export const MOCK_WEEKLY_USAGE: MockDailyUsage[] = [
  { day: 'Mon', hours: 2.5, label: '2h 30m' },
  { day: 'Tue', hours: 3.2, label: '3h 12m' },
  { day: 'Wed', hours: 2.8, label: '2h 48m' },
  { day: 'Thu', hours: 3.0, label: '3h 00m' },
  { day: 'Fri', hours: 3.8, label: '3h 48m' },
  { day: 'Sat', hours: 4.5, label: '4h 30m' },
  { day: 'Sun', hours: 3.0, label: '3h 00m' },
];

export const MOCK_RECENT_ALERTS: MockAlert[] = [
  {
    id: '1',
    childName: 'Emma',
    message: 'Daily screen time limit reached',
    timeAgo: '12 min ago',
    type: 'limit',
  },
  {
    id: '2',
    childName: 'Liam',
    message: 'TikTok blocked by active rule',
    timeAgo: '1 hr ago',
    type: 'blocked',
  },
];

export const MOCK_REPORT_SUMMARY = {
  today: '3h 00m',
  thisWeek: '18h 45m',
  vsLastWeek: '+12%',
};
