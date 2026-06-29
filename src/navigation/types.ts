import type { UserRole } from '../types/auth';
import type { ChildProfileDraft } from '../types/child';

export type AuthStackParamList = {
  Login: undefined;
  Signup: { role?: UserRole } | undefined;
};

export type ChildrenStackParamList = {
  ChildrenList: undefined;
  AddChildProfile: undefined;
  AddChildAccount: {
    profile: ChildProfileDraft;
  };
  AddChildSuccess: {
    profile: ChildProfileDraft;
    email: string;
  };
};

export type ControlsStackParamList = {
  ControlsList: undefined;
  SelectApps: {
    mode: 'block' | 'limit';
  };
};

export type ParentTabParamList = {
  Home: undefined;
  Children: undefined;
  Controls: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  ParentTabs: undefined;
  ChildHome: undefined;
};
