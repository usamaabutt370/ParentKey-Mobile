import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_LINK_CHILD_KEY = 'parent_pending_link_child_v1';
const PRE_AUTH_SETUP_ROUTE_KEY = 'parent_pre_auth_setup_route_v1';

export type PreAuthSetupRoute =
  | 'AddChildIntro'
  | 'InstallChildApp'
  | 'LinkChildQrAuth';

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
