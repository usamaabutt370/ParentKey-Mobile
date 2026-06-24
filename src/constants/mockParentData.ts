export type MockChild = {
  id: string;
  name: string;
  screenTimeToday: string;
  status: 'online' | 'offline' | 'locked';
  currentApp?: string;
};

export const MOCK_CHILDREN: MockChild[] = [
  {
    id: '1',
    name: 'Emma',
    screenTimeToday: '2h 15m',
    status: 'online',
    currentApp: 'YouTube',
  },
  {
    id: '2',
    name: 'Liam',
    screenTimeToday: '45m',
    status: 'locked',
  },
];

export const MOCK_DASHBOARD_STATS = {
  totalScreenTime: '3h 00m',
  activeRestrictions: 4,
  alerts: 2,
};
