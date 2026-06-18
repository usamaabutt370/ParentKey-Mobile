import type { UserRole } from '../types/auth';

export type AuthStackParamList = {
  Login: undefined;
  Signup: { role?: UserRole } | undefined;
};

export type AppStackParamList = {
  ParentHome: undefined;
  ChildHome: undefined;
};
