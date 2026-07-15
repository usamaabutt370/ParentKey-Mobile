import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_LINK_CHILD_KEY = 'parent_pending_link_child_v1';
const PRE_AUTH_SETUP_ROUTE_KEY = 'parent_pre_auth_setup_route_v1';
const DEVICE_ROLE_KEY = 'parent_device_role_v1';
const WELCOME_VISITED_KEY = 'parent_welcome_visited_v1';

export type PreAuthSetupRoute =
  | 'AddChildIntro'
  | 'InstallChildApp'
  | 'LinkChildQrAuth';

export type DeviceRoleChoice = 'parent' | 'kid';

const VALID_PRE_AUTH_ROUTES = new Set<PreAuthSetupRoute>([
  'AddChildIntro',
  'InstallChildApp',
  'LinkChildQrAuth',
]);

export async function setPendingLinkChild(): Promise<void> {
  await AsyncStorage.setItem(PENDING_LINK_CHILD_KEY, '1');
}

export async function hasPendingLinkChild(): Promise<boolean> {
  const value = await AsyncStorage.getItem(PENDING_LINK_CHILD_KEY);
  return value === '1';
}

export async function clearPendingLinkChild(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_LINK_CHILD_KEY);
}

export async function setPreAuthSetupRoute(
  route: PreAuthSetupRoute,
): Promise<void> {
  await AsyncStorage.setItem(PRE_AUTH_SETUP_ROUTE_KEY, route);
}

export async function getPreAuthSetupRoute(): Promise<PreAuthSetupRoute | null> {
  const value = await AsyncStorage.getItem(PRE_AUTH_SETUP_ROUTE_KEY);
  if (value && VALID_PRE_AUTH_ROUTES.has(value as PreAuthSetupRoute)) {
    return value as PreAuthSetupRoute;
  }
  return null;
}

export async function clearPreAuthSetupRoute(): Promise<void> {
  await AsyncStorage.removeItem(PRE_AUTH_SETUP_ROUTE_KEY);
}

export async function setDeviceRoleChoice(
  role: DeviceRoleChoice,
): Promise<void> {
  await AsyncStorage.setItem(DEVICE_ROLE_KEY, role);
}

export async function getDeviceRoleChoice(): Promise<DeviceRoleChoice | null> {
  const value = await AsyncStorage.getItem(DEVICE_ROLE_KEY);
  if (value === 'parent' || value === 'kid') {
    return value;
  }
  return null;
}

export async function clearDeviceRoleChoice(): Promise<void> {
  await AsyncStorage.removeItem(DEVICE_ROLE_KEY);
}

export async function markParentWelcomeVisited(): Promise<void> {
  await AsyncStorage.setItem(WELCOME_VISITED_KEY, '1');
}

export async function isParentWelcomeVisited(): Promise<boolean> {
  const value = await AsyncStorage.getItem(WELCOME_VISITED_KEY);
  return value === '1';
}

export async function clearParentWelcomeVisited(): Promise<void> {
  await AsyncStorage.removeItem(WELCOME_VISITED_KEY);
}
