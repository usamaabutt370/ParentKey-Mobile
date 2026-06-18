import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'parent' | 'child';

export const USER_ROLES: UserRole[] = ['parent', 'child'];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  parent: 'Parent',
  child: 'Child',
};

export function getUserRole(user: User | null | undefined): UserRole | null {
  const role = user?.user_metadata?.role;
  return role === 'parent' || role === 'child' ? role : null;
}

export function getRoleFromSession(session: Session | null): UserRole | null {
  return getUserRole(session?.user);
}
