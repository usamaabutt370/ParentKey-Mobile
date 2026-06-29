import type { NavigatorScreenParams } from '@react-navigation/native';
import type { UserRole } from '../types/auth';
import type { ChildProfileDraft } from '../types/child';

export type AuthStackParamList = {
  Login: undefined;
  Signup: { role?: UserRole } | undefined;
  ForgotPassword: undefined;
};

export type ChildrenStackParamList = {
  ChildrenList: undefined;
  ChildDetail: {
    childId: string;
  };
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
  Children: NavigatorScreenParams<ChildrenStackParamList> | undefined;
  Controls: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  ParentTabs: undefined;
  ChildHome: undefined;
};
